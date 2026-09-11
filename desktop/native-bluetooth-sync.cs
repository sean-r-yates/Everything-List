using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Devices.Bluetooth.Rfcomm;
using Windows.Devices.Enumeration;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Foundation;
using Windows.Networking.Sockets;
using Windows.Storage.Streams;

internal sealed class NativeBluetoothSync
{
    private static readonly Guid ServiceUuid = Guid.Parse("1e7d6a0a-4b8c-4f54-9f0c-3d38f5f03f42");
    private static readonly Guid RxUuid = Guid.Parse("1e7d6a0b-4b8c-4f54-9f0c-3d38f5f03f42");
    private static readonly Guid TxUuid = Guid.Parse("1e7d6a0c-4b8c-4f54-9f0c-3d38f5f03f42");

    private const int BundleStart = 1;
    private const int BundleChunk = 2;
    private const int BundleDone = 3;
    private const int Ack = 4;
    private const int Error = 5;
    private const int Pull = 20;
    private const int PushStart = 21;
    private const int PushChunk = 22;
    private const int PushDone = 23;
    private const int ChunkSize = 18;
    private const int MaxClassicBundleBytes = 50 * 1024 * 1024;

    private readonly object receiveLock = new object();
    private readonly List<byte[]> bundleChunks = new List<byte[]>();
    private TaskCompletionSource<string> bundleWaiter;
    private TaskCompletionSource<bool> ackWaiter;
    private int bundleBytes;

    private sealed class GattConnection : IDisposable
    {
        public GattDeviceService Service;
        public BluetoothLEDevice DeviceToDispose;
        public string DeviceName;

        public void Dispose()
        {
            if (Service != null)
            {
                Service.Dispose();
            }
            if (DeviceToDispose != null)
            {
                DeviceToDispose.Dispose();
            }
        }
    }

    public static int Main(string[] args)
    {
        try
        {
            if (args.Length > 0 && args[0] == "--self-test")
            {
                EmitStatus("Native Bluetooth helper is available.");
                return 0;
            }

            new NativeBluetoothSync().RunAsync().GetAwaiter().GetResult();
            return 0;
        }
        catch (Exception error)
        {
            EmitError(FriendlyError(error));
            return 1;
        }
    }

    private async Task RunAsync()
    {
        string pcBundle = Console.In.ReadToEnd();
        if (string.IsNullOrWhiteSpace(pcBundle))
        {
            throw new InvalidOperationException("No PC sync bundle was provided.");
        }

        EmitStatus("Start Bluetooth sync on Android and wait for Ready. Scanning for EveryList...");
        Exception gattError = null;
        try
        {
            string androidBundle = await SyncWithGattAsync(pcBundle);
            EmitBundle(androidBundle);
            return;
        }
        catch (Exception error)
        {
            gattError = error;
        }

        EmitStatus("BLE sync could not open the EveryList service. Trying classic Bluetooth fallback...");
        string fallbackBundle = await SyncWithRfcommAsync(pcBundle, gattError);
        EmitBundle(fallbackBundle);
    }

    private async Task<string> SyncWithGattAsync(string pcBundle)
    {
        using (GattConnection connection = await OpenEveryListConnectionAsync())
        {
            GattDeviceService service = connection.Service;
            EmitStatus("Connected to " + SafeName(connection.DeviceName) + ". Opening EveryList sync channels...");
            GattCharacteristic rx = await FindCharacteristicAsync(service, RxUuid, "send");
            GattCharacteristic tx = await FindCharacteristicAsync(service, TxUuid, "receive");

            TypedEventHandler<GattCharacteristic, GattValueChangedEventArgs> valueChangedHandler = OnTxValueChanged;
            EventRegistrationToken valueChangedToken = AddWinRtEvent(tx, "ValueChanged", valueChangedHandler);
            try
            {
                EmitStatus("Opening Bluetooth send and receive channels...");
                GattCommunicationStatus notifyStatus = await WithTimeout(
                    ToTask(tx.WriteClientCharacteristicConfigurationDescriptorAsync(
                        GattClientCharacteristicConfigurationDescriptorValue.Notify
                    )),
                    15000,
                    "Windows connected, but notifications did not open."
                );
                EnsureGattSuccess(notifyStatus, "Notifications did not open");

                EmitStatus("Pulling Android changes...");
                bundleWaiter = NewWaiter<string>();
                await WriteFrameAsync(rx, Pull);
                string androidBundle = await WithTimeout(
                    bundleWaiter.Task,
                    180000,
                    "Timed out waiting for Android changes."
                );

                EmitStatus("Sending PC changes...");
                ackWaiter = NewWaiter<bool>();
                await PushPcBundleAsync(rx, pcBundle);
                await WithTimeout(ackWaiter.Task, 180000, "Timed out waiting for Android to import PC changes.");

                EmitStatus("Bluetooth sync finished.");
                return androidBundle;
            }
            finally
            {
                RemoveWinRtEvent(tx, "ValueChanged", valueChangedToken);
                TryDisableNotificationsAsync(tx).GetAwaiter().GetResult();
            }
        }
    }

    private async Task<string> SyncWithRfcommAsync(string pcBundle, Exception gattError)
    {
        Exception rfcommError = null;
        try
        {
            EmitStatus("Searching for classic EveryList Bluetooth fallback...");
            RfcommDeviceService service = await OpenRfcommServiceAsync();
            using (service)
            using (StreamSocket socket = new StreamSocket())
            {
                EmitStatus("Opening classic Bluetooth connection...");
                await WithTimeout(
                    ToTask(socket.ConnectAsync(
                        service.ConnectionHostName,
                        service.ConnectionServiceName,
                        SocketProtectionLevel.BluetoothEncryptionAllowNullAuthentication
                    )),
                    30000,
                    "Windows found the classic EveryList service, but could not connect."
                );

                DataReader reader = new DataReader(socket.InputStream);
                DataWriter writer = new DataWriter(socket.OutputStream);
                reader.ByteOrder = ByteOrder.BigEndian;
                writer.ByteOrder = ByteOrder.BigEndian;
                try
                {
                    EmitStatus("Classic Bluetooth connected. Receiving Android changes...");
                    string androidBundle = await ReadSocketStringAsync(reader, 180000, "Timed out waiting for Android changes over classic Bluetooth.");
                    EmitStatus("Sending PC changes over classic Bluetooth...");
                    await WriteSocketStringAsync(writer, pcBundle, 180000, "Timed out sending PC changes over classic Bluetooth.");
                    string ack = await ReadSocketStringAsync(reader, 60000, "Timed out waiting for Android to import PC changes over classic Bluetooth.");
                    if (!ack.StartsWith("OK", StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException("Android rejected classic Bluetooth sync: " + ack);
                    }
                    EmitStatus("Classic Bluetooth sync finished.");
                    return androidBundle;
                }
                finally
                {
                    reader.DetachStream();
                    writer.DetachStream();
                }
            }
        }
        catch (Exception error)
        {
            rfcommError = error;
        }

        throw new InvalidOperationException(
            "Bluetooth could not open EveryList through BLE or classic Bluetooth. " +
            "BLE path: " + gattError.Message + " Classic path: " +
            (rfcommError == null ? "unknown error." : rfcommError.Message)
        );
    }

    private async Task<GattConnection> OpenEveryListConnectionAsync()
    {
        Exception directError = null;
        try
        {
            return await OpenServiceDirectAsync();
        }
        catch (Exception error)
        {
            directError = error;
            EmitStatus("Direct EveryList service discovery did not finish. Trying Bluetooth address fallback...");
        }

        try
        {
            ulong address = await ScanForPhoneAsync();
            BluetoothLEDevice device = await OpenDeviceAsync(address);
            try
            {
                EmitStatus("Connected to " + SafeName(device.Name) + ". Finding EveryList service...");
                return new GattConnection
                {
                    Service = await FindServiceAsync(device),
                    DeviceToDispose = device,
                    DeviceName = SafeName(device.Name)
                };
            }
            catch
            {
                device.Dispose();
                throw;
            }
        }
        catch (Exception addressError)
        {
            throw new InvalidOperationException(
                "Bluetooth could not open the EveryList service. " +
                "Direct service path: " + directError.Message + " Address path: " + addressError.Message
            );
        }
    }

    private async Task<GattConnection> OpenServiceDirectAsync()
    {
        await EnsureBluetoothAvailableAsync();

        EmitStatus("Searching for the EveryList GATT service directly...");
        DeviceInformation info = await FindGattServiceInfoAsync();
        Exception lastError = null;

        for (int attempt = 1; attempt <= 3; attempt++)
        {
            try
            {
                EmitStatus("Opening EveryList GATT service (" + attempt + "/3)...");
                GattDeviceService service = await WithTimeout(
                    ToTask(GattDeviceService.FromIdAsync(info.Id, GattSharingMode.SharedReadAndWrite)),
                    12000,
                    "Windows found the EveryList service, but could not open it."
                );
                if (service == null)
                {
                    lastError = new InvalidOperationException("Windows opened the EveryList service but returned no service object.");
                }
                else
                {
                    GattOpenStatus openStatus = await WithTimeout(
                        ToTask(service.OpenAsync(GattSharingMode.SharedReadAndWrite)),
                        10000,
                        "Windows found the EveryList service, but could not fully open it."
                    );
                    if (openStatus == GattOpenStatus.Success || openStatus == GattOpenStatus.AlreadyOpened)
                    {
                        return new GattConnection
                        {
                            Service = service,
                            DeviceName = ServiceDeviceName(service, info)
                        };
                    }
                    lastError = new InvalidOperationException("Opening the EveryList service returned " + openStatus + ".");
                    service.Dispose();
                }
            }
            catch (Exception error)
            {
                lastError = error;
            }

            if (attempt < 3)
            {
                EmitStatus("Windows saw the EveryList service, but did not open it. Retrying...");
                await Task.Delay(1500 * attempt);
            }
        }

        throw new InvalidOperationException(
            "Windows found the EveryList service, but could not open it after 3 tries. " +
            (lastError == null ? "" : lastError.Message)
        );
    }

    private async Task<DeviceInformation> FindGattServiceInfoAsync()
    {
        string selector = GattDeviceService.GetDeviceSelectorFromUuid(ServiceUuid);
        TaskCompletionSource<DeviceInformation> found = NewWaiter<DeviceInformation>();
        DeviceWatcher watcher = DeviceInformation.CreateWatcher(selector);
        TypedEventHandler<DeviceWatcher, DeviceInformation> addedHandler = (sender, info) =>
        {
            if (info != null && !string.IsNullOrWhiteSpace(info.Id))
            {
                found.TrySetResult(info);
            }
        };
        TypedEventHandler<DeviceWatcher, object> stoppedHandler = (sender, args) =>
        {
            if (!found.Task.IsCompleted && watcher.Status == DeviceWatcherStatus.Aborted)
            {
                found.TrySetException(new InvalidOperationException("Windows stopped direct Bluetooth service discovery."));
            }
        };
        EventRegistrationToken addedToken = AddWinRtEvent(watcher, "Added", addedHandler);
        EventRegistrationToken stoppedToken = AddWinRtEvent(watcher, "Stopped", stoppedHandler);

        watcher.Start();
        try
        {
            return await WithTimeout(
                found.Task,
                18000,
                "Could not see the Android EveryList GATT service. Keep Android Bluetooth sync open until it says Ready."
            );
        }
        finally
        {
            try
            {
                watcher.Stop();
            }
            catch
            {
            }
            RemoveWinRtEvent(watcher, "Added", addedToken);
            RemoveWinRtEvent(watcher, "Stopped", stoppedToken);
        }
    }

    private async Task EnsureBluetoothAvailableAsync()
    {
        BluetoothAdapter adapter = await WithTimeout(
            ToTask(BluetoothAdapter.GetDefaultAsync()),
            8000,
            "Windows Bluetooth adapter did not respond."
        );
        if (adapter == null)
        {
            throw new InvalidOperationException("Bluetooth is turned off or unavailable on this PC.");
        }
    }

    private async Task<BluetoothLEDevice> OpenDeviceAsync(ulong address)
    {
        Exception lastError = null;
        for (int attempt = 1; attempt <= 2; attempt++)
        {
            try
            {
                EmitStatus("Opening native Bluetooth connection (" + attempt + "/3)...");
                BluetoothLEDevice device = await WithTimeout(
                    ToTask(BluetoothLEDevice.FromBluetoothAddressAsync(address)),
                    12000,
                    "Windows found the phone, but native Bluetooth could not open the device."
                );
                if (device != null)
                {
                    return device;
                }
                lastError = new InvalidOperationException("Windows opened Bluetooth but returned no device.");
            }
            catch (Exception error)
            {
                lastError = error;
            }

            if (attempt < 2)
            {
                EmitStatus("Windows saw the phone, but the Bluetooth connection did not open. Retrying...");
                await Task.Delay(1500 * attempt);
            }
        }

        throw new InvalidOperationException(
            "Bluetooth found the phone, but Windows could not open the connection after 2 tries. " +
            "Keep Android Bluetooth sync open on Ready, keep the phone unlocked, and toggle Bluetooth off and on once if it repeats. " +
            (lastError == null ? "" : lastError.Message)
        );
    }

    private async Task<ulong> ScanForPhoneAsync()
    {
        await EnsureBluetoothAvailableAsync();

        TaskCompletionSource<ulong> found = NewWaiter<ulong>();
        BluetoothLEAdvertisementWatcher watcher = new BluetoothLEAdvertisementWatcher
        {
            ScanningMode = BluetoothLEScanningMode.Active
        };
        watcher.AdvertisementFilter.Advertisement.ServiceUuids.Add(ServiceUuid);
        TypedEventHandler<BluetoothLEAdvertisementWatcher, BluetoothLEAdvertisementReceivedEventArgs> receivedHandler = (sender, args) =>
        {
            found.TrySetResult(args.BluetoothAddress);
        };
        TypedEventHandler<BluetoothLEAdvertisementWatcher, BluetoothLEAdvertisementWatcherStoppedEventArgs> stoppedHandler = (sender, args) =>
        {
            if (args.Error != BluetoothError.Success)
            {
                found.TrySetException(new InvalidOperationException("Windows Bluetooth scan stopped: " + args.Error + "."));
            }
        };
        EventRegistrationToken receivedToken = AddWinRtEvent(watcher, "Received", receivedHandler);
        EventRegistrationToken stoppedToken = AddWinRtEvent(watcher, "Stopped", stoppedHandler);

        watcher.Start();
        try
        {
            return await WithTimeout(
                found.Task,
                20000,
                "Could not see the Android EveryList sync service. Keep Android Bluetooth sync open until it says Ready."
            );
        }
        finally
        {
            watcher.Stop();
            RemoveWinRtEvent(watcher, "Received", receivedToken);
            RemoveWinRtEvent(watcher, "Stopped", stoppedToken);
        }
    }

    private async Task<GattDeviceService> FindServiceAsync(BluetoothLEDevice device)
    {
        Exception lastError = null;
        DateTime deadline = DateTime.UtcNow.AddMilliseconds(15000);
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                GattDeviceServicesResult services = await WithTimeout(
                    ToTask(device.GetGattServicesForUuidAsync(ServiceUuid, BluetoothCacheMode.Uncached)),
                    8000,
                    "Windows took too long finding the EveryList service."
                );
                if (services.Status == GattCommunicationStatus.Success && services.Services.Count > 0)
                {
                    return services.Services[0];
                }
                lastError = new InvalidOperationException("Service lookup returned " + services.Status + ".");
            }
            catch (Exception error)
            {
                lastError = error;
            }

            EmitStatus("Waiting for Android to expose the EveryList service...");
            await Task.Delay(1200);
        }

        throw new InvalidOperationException("Bluetooth connected, but Windows could not find the EveryList service. " + (lastError == null ? "" : lastError.Message));
    }

    private async Task<RfcommDeviceService> OpenRfcommServiceAsync()
    {
        await EnsureBluetoothAvailableAsync();
        RfcommServiceId serviceId = RfcommServiceId.FromUuid(ServiceUuid);
        Exception watcherError = null;
        try
        {
            return await OpenWatchedRfcommServiceAsync(serviceId);
        }
        catch (Exception error)
        {
            watcherError = error;
            EmitStatus("Classic service watcher did not find EveryList. Checking paired Bluetooth devices...");
        }

        try
        {
            return await OpenRfcommServiceFromPairedDevicesAsync(serviceId);
        }
        catch (Exception pairedError)
        {
            throw new InvalidOperationException(
                (watcherError == null ? "" : watcherError.Message + " ") +
                "Paired-device path: " + pairedError.Message
            );
        }
    }

    private async Task<RfcommDeviceService> OpenWatchedRfcommServiceAsync(RfcommServiceId serviceId)
    {
        string selector = RfcommDeviceService.GetDeviceSelector(serviceId);
        TaskCompletionSource<DeviceInformation> found = NewWaiter<DeviceInformation>();
        DeviceWatcher watcher = DeviceInformation.CreateWatcher(selector);
        TypedEventHandler<DeviceWatcher, DeviceInformation> addedHandler = (sender, info) =>
        {
            if (info != null && !string.IsNullOrWhiteSpace(info.Id))
            {
                found.TrySetResult(info);
            }
        };
        TypedEventHandler<DeviceWatcher, object> stoppedHandler = (sender, args) =>
        {
            if (!found.Task.IsCompleted && watcher.Status == DeviceWatcherStatus.Aborted)
            {
                found.TrySetException(new InvalidOperationException("Windows stopped classic Bluetooth service discovery."));
            }
        };
        EventRegistrationToken addedToken = AddWinRtEvent(watcher, "Added", addedHandler);
        EventRegistrationToken stoppedToken = AddWinRtEvent(watcher, "Stopped", stoppedHandler);

        watcher.Start();
        try
        {
            DeviceInformation info = await WithTimeout(
                found.Task,
                60000,
                "Classic Bluetooth fallback could not see the EveryList service. Pair this phone with Windows or accept the Android visibility prompt, then try again."
            );
            RfcommDeviceService service = await WithTimeout(
                ToTask(RfcommDeviceService.FromIdAsync(info.Id)),
                30000,
                "Windows found the classic EveryList service, but could not open it."
            );
            if (service == null)
            {
                throw new InvalidOperationException("Windows opened classic Bluetooth but returned no EveryList service.");
            }
            return service;
        }
        finally
        {
            try
            {
                watcher.Stop();
            }
            catch
            {
            }
            RemoveWinRtEvent(watcher, "Added", addedToken);
            RemoveWinRtEvent(watcher, "Stopped", stoppedToken);
        }
    }

    private async Task<RfcommDeviceService> OpenRfcommServiceFromPairedDevicesAsync(RfcommServiceId serviceId)
    {
        string selector = BluetoothDevice.GetDeviceSelectorFromPairingState(true);
        var devices = await WithTimeout(
            ToTask(DeviceInformation.FindAllAsync(selector)),
            20000,
            "Windows took too long checking paired Bluetooth devices."
        );
        if (devices == null || devices.Count == 0)
        {
            throw new InvalidOperationException("No paired Bluetooth devices were found. Pair the phone in Windows Bluetooth settings, then retry.");
        }

        Exception lastError = null;
        foreach (DeviceInformation info in devices)
        {
            if (info == null || string.IsNullOrWhiteSpace(info.Id)) continue;
            string infoName = SafeName(info.Name);
            BluetoothDevice device = null;
            try
            {
                EmitStatus("Checking paired Bluetooth device " + infoName + "...");
                device = await WithTimeout(
                    ToTask(BluetoothDevice.FromIdAsync(info.Id)),
                    12000,
                    "Windows took too long opening paired Bluetooth device " + infoName + "."
                );
                if (device == null)
                {
                    lastError = new InvalidOperationException("Windows returned no Bluetooth device for " + infoName + ".");
                    continue;
                }

                RfcommDeviceServicesResult result = await WithTimeout(
                    ToTask(device.GetRfcommServicesForIdAsync(serviceId, BluetoothCacheMode.Uncached)),
                    25000,
                    "Windows took too long checking EveryList classic service on " + SafeName(device.Name) + "."
                );
                if (result != null && result.Services.Count > 0)
                {
                    EmitStatus("Found classic EveryList service on " + SafeName(device.Name) + ".");
                    RfcommDeviceService service = result.Services[0];
                    device = null;
                    return service;
                }

                lastError = new InvalidOperationException(
                    SafeName(device.Name) + " did not expose EveryList classic service" +
                    (result == null ? "." : " (" + result.Error + ").")
                );
            }
            catch (Exception error)
            {
                lastError = error;
            }
            finally
            {
                if (device != null)
                {
                    try
                    {
                        IDisposable disposable = device as IDisposable;
                        if (disposable != null)
                        {
                            disposable.Dispose();
                        }
                    }
                    catch
                    {
                    }
                }
            }
        }

        throw new InvalidOperationException(
            "No paired Bluetooth device exposed the EveryList classic service. " +
            "Open Android Bluetooth sync, accept the visibility prompt, and make sure the phone is paired in Windows Bluetooth settings. " +
            (lastError == null ? "" : "Last paired-device message: " + lastError.Message)
        );
    }

    private async Task<GattCharacteristic> FindCharacteristicAsync(GattDeviceService service, Guid uuid, string label)
    {
        GattCharacteristicsResult result = await WithTimeout(
            ToTask(service.GetCharacteristicsForUuidAsync(uuid, BluetoothCacheMode.Uncached)),
            15000,
            "Windows took too long finding the Bluetooth " + label + " channel."
        );
        if (result.Status != GattCommunicationStatus.Success || result.Characteristics.Count == 0)
        {
            throw new InvalidOperationException("Bluetooth connected, but the phone did not expose the " + label + " channel.");
        }
        return result.Characteristics[0];
    }

    private async Task PushPcBundleAsync(GattCharacteristic rx, string pcBundle)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(pcBundle);
        await WriteFrameAsync(rx, PushStart);
        for (int offset = 0; offset < bytes.Length; offset += ChunkSize)
        {
            int length = Math.Min(ChunkSize, bytes.Length - offset);
            byte[] chunk = new byte[length];
            Array.Copy(bytes, offset, chunk, 0, length);
            await WriteFrameAsync(rx, PushChunk, chunk);
            EmitStatus("Sending PC bundle (" + Math.Min(offset + length, bytes.Length) + " / " + bytes.Length + " bytes)...");
        }
        await WriteFrameAsync(rx, PushDone);
    }

    private async Task WriteFrameAsync(GattCharacteristic rx, int type)
    {
        await WriteFrameAsync(rx, type, Array.Empty<byte>());
    }

    private async Task WriteFrameAsync(GattCharacteristic rx, int type, byte[] payload)
    {
        byte[] frame = new byte[1 + payload.Length];
        frame[0] = (byte)type;
        Array.Copy(payload, 0, frame, 1, payload.Length);
        GattCommunicationStatus status = await WithTimeout(
            ToTask(rx.WriteValueAsync(ToBuffer(frame), GattWriteOption.WriteWithResponse)),
            12000,
            "Windows took too long writing to Android."
        );
        EnsureGattSuccess(status, "Bluetooth write failed");
    }

    private async Task<string> ReadSocketStringAsync(DataReader reader, int timeoutMs, string timeoutMessage)
    {
        uint headerBytes = await WithTimeout(
            ToTask(reader.LoadAsync(4)),
            timeoutMs,
            timeoutMessage
        );
        if (headerBytes < 4)
        {
            throw new InvalidOperationException("Classic Bluetooth connection closed before the sync bundle size arrived.");
        }

        int length = reader.ReadInt32();
        if (length < 0 || length > MaxClassicBundleBytes)
        {
            throw new InvalidOperationException("Classic Bluetooth received an invalid sync bundle size.");
        }
        if (length == 0)
        {
            return "";
        }

        uint bodyBytes = await WithTimeout(
            ToTask(reader.LoadAsync((uint)length)),
            timeoutMs,
            timeoutMessage
        );
        if (bodyBytes < length)
        {
            throw new InvalidOperationException("Classic Bluetooth connection closed before the full sync bundle arrived.");
        }
        byte[] bytes = new byte[length];
        reader.ReadBytes(bytes);
        return Encoding.UTF8.GetString(bytes);
    }

    private async Task WriteSocketStringAsync(DataWriter writer, string value, int timeoutMs, string timeoutMessage)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(value ?? "");
        writer.WriteInt32(bytes.Length);
        writer.WriteBytes(bytes);
        await WithTimeout(
            ToTask(writer.StoreAsync()),
            timeoutMs,
            timeoutMessage
        );
    }

    private void OnTxValueChanged(GattCharacteristic sender, GattValueChangedEventArgs args)
    {
        byte[] frame = ReadBuffer(args.CharacteristicValue);
        if (frame.Length == 0) return;

        int type = frame[0] & 0xff;
        byte[] payload = new byte[frame.Length - 1];
        Array.Copy(frame, 1, payload, 0, payload.Length);

        lock (receiveLock)
        {
            if (type == Error)
            {
                string message = Encoding.UTF8.GetString(payload);
                if (bundleWaiter != null) bundleWaiter.TrySetException(new InvalidOperationException(message));
                if (ackWaiter != null) ackWaiter.TrySetException(new InvalidOperationException(message));
                return;
            }
            if (type == BundleStart)
            {
                bundleChunks.Clear();
                bundleBytes = 0;
                EmitStatus("Receiving Android bundle...");
                return;
            }
            if (type == BundleChunk)
            {
                bundleChunks.Add(payload);
                bundleBytes += payload.Length;
                EmitStatus("Receiving Android bundle (" + bundleBytes + " bytes)...");
                return;
            }
            if (type == BundleDone)
            {
                if (bundleWaiter != null) bundleWaiter.TrySetResult(Encoding.UTF8.GetString(Join(bundleChunks)));
                return;
            }
            if (type == Ack)
            {
                if (ackWaiter != null) ackWaiter.TrySetResult(true);
            }
        }
    }

    private async Task TryDisableNotificationsAsync(GattCharacteristic tx)
    {
        try
        {
            await ToTask(tx.WriteClientCharacteristicConfigurationDescriptorAsync(
                GattClientCharacteristicConfigurationDescriptorValue.None
            ));
        }
        catch
        {
        }
    }

    private static byte[] ReadBuffer(IBuffer buffer)
    {
        using (DataReader reader = DataReader.FromBuffer(buffer))
        {
            byte[] bytes = new byte[(int)buffer.Length];
            reader.ReadBytes(bytes);
            return bytes;
        }
    }

    private static IBuffer ToBuffer(byte[] bytes)
    {
        DataWriter writer = new DataWriter();
        writer.WriteBytes(bytes);
        return writer.DetachBuffer();
    }

    private static byte[] Join(List<byte[]> chunks)
    {
        int total = 0;
        foreach (byte[] chunk in chunks) total += chunk.Length;
        byte[] all = new byte[total];
        int offset = 0;
        foreach (byte[] chunk in chunks)
        {
            Array.Copy(chunk, 0, all, offset, chunk.Length);
            offset += chunk.Length;
        }
        return all;
    }

    private static Task<T> ToTask<T>(IAsyncOperation<T> operation)
    {
        TaskCompletionSource<T> task = NewWaiter<T>();
        operation.Completed = (source, status) =>
        {
            CompleteAsyncOperation(source, status, task);
        };
        return task.Task;
    }

    private static Task ToTask(IAsyncAction action)
    {
        TaskCompletionSource<bool> task = NewWaiter<bool>();
        action.Completed = (source, status) =>
        {
            CompleteAsyncAction(source, status, task);
        };
        return task.Task;
    }

    private static void CompleteAsyncOperation<T>(IAsyncOperation<T> operation, AsyncStatus status, TaskCompletionSource<T> task)
    {
        try
        {
            if (status == AsyncStatus.Completed)
            {
                task.TrySetResult(operation.GetResults());
            }
            else if (status == AsyncStatus.Canceled)
            {
                task.TrySetCanceled();
            }
            else
            {
                task.TrySetException(operation.ErrorCode ?? new InvalidOperationException("Windows async operation failed."));
            }
        }
        catch (Exception error)
        {
            task.TrySetException(error);
        }
    }

    private static void CompleteAsyncAction(IAsyncAction action, AsyncStatus status, TaskCompletionSource<bool> task)
    {
        try
        {
            if (status == AsyncStatus.Completed)
            {
                action.GetResults();
                task.TrySetResult(true);
            }
            else if (status == AsyncStatus.Canceled)
            {
                task.TrySetCanceled();
            }
            else
            {
                task.TrySetException(action.ErrorCode ?? new InvalidOperationException("Windows async action failed."));
            }
        }
        catch (Exception error)
        {
            task.TrySetException(error);
        }
    }

    private static Task<T> WithTimeout<T>(Task<T> task, int timeoutMs, string message)
    {
        return WithTimeoutInternal(task, timeoutMs, message);
    }

    private static Task WithTimeout(Task task, int timeoutMs, string message)
    {
        return WithTimeoutInternal(task, timeoutMs, message);
    }

    private static async Task<T> WithTimeoutInternal<T>(Task<T> task, int timeoutMs, string message)
    {
        Task completed = await Task.WhenAny(task, Task.Delay(timeoutMs));
        if (completed != task)
        {
            throw new TimeoutException(message);
        }
        return await task;
    }

    private static async Task WithTimeoutInternal(Task task, int timeoutMs, string message)
    {
        Task completed = await Task.WhenAny(task, Task.Delay(timeoutMs));
        if (completed != task)
        {
            throw new TimeoutException(message);
        }
        await task;
    }

    private static TaskCompletionSource<T> NewWaiter<T>()
    {
        return new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
    }

    private static EventRegistrationToken AddWinRtEvent(object target, string eventName, object handler)
    {
        object token = target.GetType().GetMethod("add_" + eventName).Invoke(target, new[] { handler });
        return (EventRegistrationToken)token;
    }

    private static void RemoveWinRtEvent(object target, string eventName, EventRegistrationToken token)
    {
        try
        {
            target.GetType().GetMethod("remove_" + eventName).Invoke(target, new object[] { token });
        }
        catch
        {
        }
    }

    private static void EnsureGattSuccess(GattCommunicationStatus status, string action)
    {
        if (status != GattCommunicationStatus.Success)
        {
            throw new InvalidOperationException(action + ": " + status + ".");
        }
    }

    private static string SafeName(string value)
    {
        return string.IsNullOrWhiteSpace(value) ? "Android phone" : value;
    }

    private static string ServiceDeviceName(GattDeviceService service, DeviceInformation info)
    {
        if (info != null && !string.IsNullOrWhiteSpace(info.Name))
        {
            return info.Name;
        }
        if (service != null && service.Device != null && !string.IsNullOrWhiteSpace(service.Device.Name))
        {
            return service.Device.Name;
        }
        return "Android phone";
    }

    private static string FriendlyError(Exception error)
    {
        string message = error.Message ?? "Bluetooth sync failed.";
        if (message.IndexOf("Access is denied", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            return "Windows denied Bluetooth access. Turn Bluetooth on and allow Nearby/Bluetooth permissions.";
        }
        return message;
    }

    private static void EmitStatus(string message)
    {
        Emit("status", message, null);
    }

    private static void EmitError(string message)
    {
        Emit("error", message, null);
    }

    private static void EmitBundle(string bundle)
    {
        Emit("bundle", null, Convert.ToBase64String(Encoding.UTF8.GetBytes(bundle)));
    }

    private static void Emit(string type, string message, string payloadBase64)
    {
        Console.Write("{\"type\":\"");
        Console.Write(Json(type));
        Console.Write("\"");
        if (message != null)
        {
            Console.Write(",\"message\":\"");
            Console.Write(Json(message));
            Console.Write("\"");
        }
        if (payloadBase64 != null)
        {
            Console.Write(",\"payloadBase64\":\"");
            Console.Write(payloadBase64);
            Console.Write("\"");
        }
        Console.WriteLine("}");
        Console.Out.Flush();
    }

    private static string Json(string value)
    {
        StringBuilder output = new StringBuilder();
        foreach (char c in value ?? "")
        {
            switch (c)
            {
                case '\\': output.Append("\\\\"); break;
                case '"': output.Append("\\\""); break;
                case '\n': output.Append("\\n"); break;
                case '\r': output.Append("\\r"); break;
                case '\t': output.Append("\\t"); break;
                default:
                    if (c < 32) output.Append("\\u").Append(((int)c).ToString("x4"));
                    else output.Append(c);
                    break;
            }
        }
        return output.ToString();
    }
}
