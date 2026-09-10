package local.shoppinglist.android;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothGattServerCallback;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@SuppressLint("MissingPermission")
final class BluetoothSyncServer {
    static final UUID SERVICE_UUID = UUID.fromString("1e7d6a0a-4b8c-4f54-9f0c-3d38f5f03f42");
    private static final UUID RX_UUID = UUID.fromString("1e7d6a0b-4b8c-4f54-9f0c-3d38f5f03f42");
    private static final UUID TX_UUID = UUID.fromString("1e7d6a0c-4b8c-4f54-9f0c-3d38f5f03f42");
    private static final UUID CLIENT_CONFIG_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    private static final int BUNDLE_START = 1;
    private static final int BUNDLE_CHUNK = 2;
    private static final int BUNDLE_DONE = 3;
    private static final int ACK = 4;
    private static final int ERROR = 5;
    private static final int PULL = 20;
    private static final int PUSH_START = 21;
    private static final int PUSH_CHUNK = 22;
    private static final int PUSH_DONE = 23;
    private static final int CHUNK_SIZE = 18;
    private static final long ADVERTISING_TIMEOUT_MS = 45000;
    private static final long CHANNEL_TIMEOUT_MS = 25000;
    private static final long FRAME_TIMEOUT_MS = 30000;
    private static final long NOTIFICATION_TIMEOUT_MS = 8000;
    private static final int MAX_CLASSIC_BUNDLE_BYTES = 50 * 1024 * 1024;

    interface Listener {
        void onStatus(String message);
        String exportSyncBundle() throws Exception;
        int importSyncBundle(String json) throws Exception;
    }

    private final Context context;
    private final Listener listener;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ExecutorService classicExecutor = Executors.newSingleThreadExecutor();
    private final Object notificationLock = new Object();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private BluetoothLeAdvertiser advertiser;
    private BluetoothGattServer gattServer;
    private BluetoothServerSocket classicServerSocket;
    private BluetoothGattCharacteristic txCharacteristic;
    private BluetoothDevice connectedDevice;
    private ByteArrayOutputStream incomingBundle;
    private boolean advertisingWithName;
    private volatile boolean running;
    private volatile boolean notificationsEnabled;
    private volatile boolean notificationPending;
    private volatile boolean pullRequested;
    private volatile boolean receivingPcBundle;
    private volatile boolean pcBundleReceived;
    private volatile boolean syncFinished;
    private volatile int sessionId;
    private volatile int classicServerToken;
    private volatile long lastPcFrameAt;
    private int notificationStatus = BluetoothGatt.GATT_SUCCESS;

    BluetoothSyncServer(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
    }

    void start() throws Exception {
        if (running) {
            status("Bluetooth sync is already waiting for the PC.");
            return;
        }

        if (!context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
            throw new IllegalStateException("This phone does not support Bluetooth LE sync.");
        }

        BluetoothManager manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = manager == null ? null : manager.getAdapter();
        if (adapter == null) {
            throw new IllegalStateException("Bluetooth is not available on this phone.");
        }
        if (!adapter.isEnabled()) {
            throw new IllegalStateException("Turn Bluetooth on, then start sync again.");
        }
        boolean canAdvertiseBle = adapter.isMultipleAdvertisementSupported();
        advertiser = canAdvertiseBle ? adapter.getBluetoothLeAdvertiser() : null;

        running = true;
        resetSessionState();
        status("Starting Bluetooth sync...");

        boolean classicStarted = startClassicServer(adapter);
        if (!canAdvertiseBle || advertiser == null) {
            if (classicStarted) {
                status("Ready with classic Bluetooth fallback. Pair the phone with Windows if the PC cannot see it.");
                return;
            }
            stop(false);
            throw new IllegalStateException("This phone cannot advertise the Listy Bluetooth service. Use Export sync bundle and Import sync bundle instead.");
        }

        gattServer = manager.openGattServer(context, gattCallback);
        if (gattServer == null) {
            if (classicStarted) {
                status("BLE sync could not open, but classic Bluetooth fallback is ready.");
                return;
            }
            stop(false);
            throw new IllegalStateException("Could not start the Bluetooth sync server.");
        }
        gattServer.clearServices();

        BluetoothGattService service = buildService();

        if (!gattServer.addService(service)) {
            if (classicStarted) {
                status("BLE sync could not publish, but classic Bluetooth fallback is ready.");
                return;
            }
            stop(false);
            throw new IllegalStateException("Could not publish the Bluetooth sync service.");
        }
    }

    void stop() {
        stop(true);
    }

    private void stop(boolean announce) {
        running = false;
        sessionId++;
        notificationsEnabled = false;
        connectedDevice = null;
        incomingBundle = null;
        pullRequested = false;
        receivingPcBundle = false;
        pcBundleReceived = false;
        syncFinished = false;
        lastPcFrameAt = 0;
        stopAdvertisingOnly();
        stopClassicServerOnly();
        advertiser = null;
        if (gattServer != null) {
            try {
                gattServer.close();
            } catch (Exception ignored) {
            }
        }
        gattServer = null;
        if (announce) {
            status("Bluetooth sync stopped.");
        }
    }

    void shutdown() {
        stop();
        executor.shutdownNow();
        classicExecutor.shutdownNow();
    }

    private void resetSessionState() {
        sessionId++;
        connectedDevice = null;
        incomingBundle = null;
        notificationsEnabled = false;
        notificationPending = false;
        pullRequested = false;
        receivingPcBundle = false;
        pcBundleReceived = false;
        syncFinished = false;
        lastPcFrameAt = 0;
    }

    private BluetoothGattService buildService() {
        BluetoothGattService service = new BluetoothGattService(
            SERVICE_UUID,
            BluetoothGattService.SERVICE_TYPE_PRIMARY
        );
        BluetoothGattCharacteristic rxCharacteristic = new BluetoothGattCharacteristic(
            RX_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
            BluetoothGattCharacteristic.PERMISSION_WRITE
        );
        txCharacteristic = new BluetoothGattCharacteristic(
            TX_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ |
                BluetoothGattCharacteristic.PROPERTY_NOTIFY |
                BluetoothGattCharacteristic.PROPERTY_INDICATE,
            BluetoothGattCharacteristic.PERMISSION_READ
        );
        txCharacteristic.addDescriptor(new BluetoothGattDescriptor(
            CLIENT_CONFIG_UUID,
            BluetoothGattDescriptor.PERMISSION_READ | BluetoothGattDescriptor.PERMISSION_WRITE
        ));
        service.addCharacteristic(rxCharacteristic);
        service.addCharacteristic(txCharacteristic);
        return service;
    }

    private void stopAdvertisingOnly() {
        if (advertiser == null) return;
        try {
            advertiser.stopAdvertising(advertiseCallback);
        } catch (Exception ignored) {
        }
    }

    private boolean startClassicServer(BluetoothAdapter adapter) {
        stopClassicServerOnly();
        try {
            classicServerSocket = adapter.listenUsingRfcommWithServiceRecord("Listy Sync", SERVICE_UUID);
            int token = ++classicServerToken;
            classicExecutor.execute(() -> acceptClassicConnections(token));
            return true;
        } catch (Exception error) {
            status("Classic Bluetooth fallback could not start: " + safeMessage(error) + ".");
            return false;
        }
    }

    private void stopClassicServerOnly() {
        classicServerToken++;
        if (classicServerSocket != null) {
            try {
                classicServerSocket.close();
            } catch (Exception ignored) {
            }
        }
        classicServerSocket = null;
    }

    private void acceptClassicConnections(int token) {
        while (running && token == classicServerToken) {
            BluetoothServerSocket serverSocket = classicServerSocket;
            if (serverSocket == null) return;
            try {
                BluetoothSocket socket = serverSocket.accept();
                handleClassicSocket(socket);
            } catch (IOException error) {
                if (running && token == classicServerToken) {
                    status("Classic Bluetooth fallback stopped: " + safeMessage(error) + ".");
                }
                return;
            } catch (Exception error) {
                if (running && token == classicServerToken) {
                    status("Classic Bluetooth fallback failed: " + safeMessage(error) + ".");
                }
            }
        }
    }

    private void handleClassicSocket(BluetoothSocket socket) {
        try (BluetoothSocket activeSocket = socket;
             DataInputStream input = new DataInputStream(activeSocket.getInputStream());
             DataOutputStream output = new DataOutputStream(activeSocket.getOutputStream())) {
            status("Classic Bluetooth connected. Sending Android changes...");
            writeClassicString(output, listener.exportSyncBundle());
            status("Classic Bluetooth waiting for PC changes...");
            String pcBundle = readClassicString(input);
            int changed = listener.importSyncBundle(pcBundle);
            writeClassicString(output, "OK " + changed);
            syncFinished = true;
            status("Bluetooth sync finished. Imported " + changed + " PC change(s).");
        } catch (Exception error) {
            status("Classic Bluetooth sync failed: " + safeMessage(error) + ".");
        }
    }

    private void writeClassicString(DataOutputStream output, String value) throws IOException {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        output.writeInt(bytes.length);
        output.write(bytes);
        output.flush();
    }

    private String readClassicString(DataInputStream input) throws IOException {
        int length = input.readInt();
        if (length < 0 || length > MAX_CLASSIC_BUNDLE_BYTES) {
            throw new IOException("The PC sent an invalid sync bundle size.");
        }
        byte[] bytes = new byte[length];
        input.readFully(bytes);
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private String safeMessage(Exception error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty() ? error.getClass().getSimpleName() : message;
    }

    private void refreshGattService() {
        if (!running) return;
        status("Refreshing Android Bluetooth sync service...");
        stopAdvertisingOnly();
        if (gattServer != null) {
            try {
                gattServer.close();
            } catch (Exception ignored) {
            }
        }
        BluetoothManager manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (manager == null) {
            status("Could not refresh Bluetooth sync service. Turn Bluetooth off and on, then tap Try again.");
            stop(false);
            return;
        }
        gattServer = manager.openGattServer(context, gattCallback);
        if (gattServer == null) {
            status("Could not reopen Bluetooth sync service. Turn Bluetooth off and on, then tap Try again.");
            stop(false);
            return;
        }
        gattServer.clearServices();
        resetSessionState();
        if (!gattServer.addService(buildService())) {
            status("Could not republish Bluetooth sync service. Turn Bluetooth off and on, then tap Try again.");
            stop(false);
        }
    }

    private void startAdvertising() {
        startAdvertising(true);
    }

    private void startAdvertising(boolean includeDeviceName) {
        if (advertiser == null) return;
        status("Listy sync service is published. Making it visible to the PC...");
        try {
            advertiser.stopAdvertising(advertiseCallback);
        } catch (Exception ignored) {
        }
        AdvertiseSettings settings = new AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .build();
        AdvertiseData data = new AdvertiseData.Builder()
            .addServiceUuid(new ParcelUuid(SERVICE_UUID))
            .setIncludeTxPowerLevel(false)
            .build();
        advertisingWithName = includeDeviceName;
        if (includeDeviceName) {
            AdvertiseData scanResponse = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .build();
            advertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);
        } else {
            advertiser.startAdvertising(settings, data, advertiseCallback);
        }
    }

    private final AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settingsInEffect) {
            status("Ready. On the PC, open Settings and press Bluetooth Sync.");
            int token = sessionId;
            mainHandler.postDelayed(() -> {
                if (running && connectedDevice == null && token == sessionId) {
                    status("Still waiting for the PC. Refreshing the Android Bluetooth service...");
                    refreshGattService();
                }
            }, ADVERTISING_TIMEOUT_MS);
        }

        @Override
        public void onStartFailure(int errorCode) {
            if (advertisingWithName && errorCode == AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE) {
                status("Phone name is too long for Bluetooth advertising. Starting compact sync mode...");
                startAdvertising(false);
                return;
            }
            status("Bluetooth sync could not start: " + advertisingFailureReason(errorCode) + ".");
            stop(false);
        }
    };

    private final BluetoothGattServerCallback gattCallback = new BluetoothGattServerCallback() {
        @Override
        public void onServiceAdded(int status, BluetoothGattService service) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                BluetoothSyncServer.this.status("Listy Bluetooth service is ready on Android.");
                startAdvertising();
            } else {
                BluetoothSyncServer.this.status("Could not publish Bluetooth sync service. Android returned GATT status " + status + ".");
                stop(false);
            }
        }

        @Override
        public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                sessionId++;
                connectedDevice = device;
                notificationsEnabled = false;
                incomingBundle = null;
                pullRequested = false;
                receivingPcBundle = false;
                pcBundleReceived = false;
                syncFinished = false;
                int token = sessionId;
                BluetoothSyncServer.this.status("PC connected. Opening sync channel...");
                mainHandler.postDelayed(() -> {
                    if (running && connectedDevice != null && !notificationsEnabled && token == sessionId) {
                        BluetoothSyncServer.this.status("PC connected, but the sync channel did not open. Stop sync on both devices and try again.");
                    }
                }, CHANNEL_TIMEOUT_MS);
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                if (connectedDevice != null && connectedDevice.equals(device)) {
                    connectedDevice = null;
                    notificationsEnabled = false;
                    incomingBundle = null;
                }
                sessionId++;
                BluetoothSyncServer.this.status(syncFinished
                    ? "Bluetooth sync finished."
                    : running
                    ? "PC disconnected. Waiting for another sync."
                    : "Bluetooth sync stopped.");
                int token = sessionId;
                mainHandler.postDelayed(() -> {
                    if (running && !syncFinished && connectedDevice == null && token == sessionId) {
                        refreshGattService();
                    }
                }, 900);
            }
        }

        @Override
        public void onCharacteristicReadRequest(
            BluetoothDevice device,
            int requestId,
            int offset,
            BluetoothGattCharacteristic characteristic
        ) {
            if (gattServer == null) return;
            byte[] value = new byte[]{0};
            if (offset > value.length) {
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null);
                return;
            }
            gattServer.sendResponse(
                device,
                requestId,
                BluetoothGatt.GATT_SUCCESS,
                offset,
                Arrays.copyOfRange(value, offset, value.length)
            );
        }

        @Override
        public void onDescriptorReadRequest(BluetoothDevice device, int requestId, int offset, BluetoothGattDescriptor descriptor) {
            if (gattServer == null) return;
            byte[] value = notificationsEnabled
                ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                : BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE;
            gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);
        }

        @Override
        public void onDescriptorWriteRequest(
            BluetoothDevice device,
            int requestId,
            BluetoothGattDescriptor descriptor,
            boolean preparedWrite,
            boolean responseNeeded,
            int offset,
            byte[] value
        ) {
            if (CLIENT_CONFIG_UUID.equals(descriptor.getUuid())) {
                notificationsEnabled =
                    Arrays.equals(value, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE) ||
                    Arrays.equals(value, BluetoothGattDescriptor.ENABLE_INDICATION_VALUE);
            }
            if (responseNeeded && gattServer != null) {
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);
            }
            if (notificationsEnabled) {
                int token = sessionId;
                BluetoothSyncServer.this.status("PC sync channel ready. Waiting for PC request...");
                mainHandler.postDelayed(() -> {
                    if (running && connectedDevice != null && notificationsEnabled && !pullRequested && token == sessionId) {
                        BluetoothSyncServer.this.status("Sync channel is ready, but the PC has not requested Android changes. Try Bluetooth Sync again from PC Settings.");
                    }
                }, FRAME_TIMEOUT_MS);
            }
        }

        @Override
        public void onCharacteristicWriteRequest(
            BluetoothDevice device,
            int requestId,
            BluetoothGattCharacteristic characteristic,
            boolean preparedWrite,
            boolean responseNeeded,
            int offset,
            byte[] value
        ) {
            if (responseNeeded && gattServer != null) {
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);
            }
            if (RX_UUID.equals(characteristic.getUuid()) && value != null && value.length > 0) {
                handleFrame(value);
            }
        }

        @Override
        public void onNotificationSent(BluetoothDevice device, int status) {
            synchronized (notificationLock) {
                notificationStatus = status;
                notificationPending = false;
                notificationLock.notifyAll();
            }
        }
    };

    private void handleFrame(byte[] frame) {
        int type = frame[0] & 0xff;
        byte[] payload = Arrays.copyOfRange(frame, 1, frame.length);
        if (type == PULL) {
            pullRequested = true;
            status("PC requested Android changes...");
            sendLocalBundle();
        } else if (type == PUSH_START) {
            incomingBundle = new ByteArrayOutputStream();
            receivingPcBundle = true;
            pcBundleReceived = false;
            lastPcFrameAt = System.currentTimeMillis();
            status("Receiving PC changes...");
            watchPcBundleTransfer(sessionId);
        } else if (type == PUSH_CHUNK) {
            if (incomingBundle != null) {
                lastPcFrameAt = System.currentTimeMillis();
                incomingBundle.write(payload, 0, payload.length);
            }
        } else if (type == PUSH_DONE) {
            pcBundleReceived = true;
            receivingPcBundle = false;
            importRemoteBundle();
        }
    }

    private void sendLocalBundle() {
        executor.execute(() -> {
            try {
                String bundle = listener.exportSyncBundle();
                byte[] bytes = bundle.getBytes(StandardCharsets.UTF_8);
                status("Sending Android changes to the PC...");
                notifyFrame(BUNDLE_START, new byte[0]);
                for (int offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
                    byte[] chunk = Arrays.copyOfRange(bytes, offset, Math.min(offset + CHUNK_SIZE, bytes.length));
                    notifyFrame(BUNDLE_CHUNK, chunk);
                }
                notifyFrame(BUNDLE_DONE, new byte[0]);
                status("Android changes sent. Waiting for PC changes...");
                int token = sessionId;
                mainHandler.postDelayed(() -> {
                    if (running && connectedDevice != null && notificationsEnabled && !receivingPcBundle && !pcBundleReceived && token == sessionId) {
                        status("Android changes were sent, but the PC did not send its bundle back. Try Bluetooth Sync again from PC Settings.");
                    }
                }, FRAME_TIMEOUT_MS);
            } catch (Exception error) {
                sendError("Could not send Android sync bundle.");
            }
        });
    }

    private void watchPcBundleTransfer(int token) {
        mainHandler.postDelayed(() -> {
            if (!running || connectedDevice == null || !receivingPcBundle || pcBundleReceived || token != sessionId) {
                return;
            }
            long idleFor = System.currentTimeMillis() - lastPcFrameAt;
            if (idleFor >= FRAME_TIMEOUT_MS) {
                status("Started receiving PC changes, but the transfer stopped. Try Bluetooth Sync again from PC Settings.");
                return;
            }
            watchPcBundleTransfer(token);
        }, FRAME_TIMEOUT_MS);
    }

    private void importRemoteBundle() {
        ByteArrayOutputStream bundle = incomingBundle;
        incomingBundle = null;
        if (bundle == null) {
            sendError("No PC sync bundle was received.");
            return;
        }
        executor.execute(() -> {
            try {
                String json = new String(bundle.toByteArray(), StandardCharsets.UTF_8);
                int changed = listener.importSyncBundle(json);
                notifyFrame(ACK, new byte[0]);
                syncFinished = true;
                status("Bluetooth sync finished. Imported " + changed + " PC change(s).");
            } catch (Exception error) {
                sendError("Could not import the PC sync bundle.");
            }
        });
    }

    private void sendError(String message) {
        try {
            notifyFrame(ERROR, message.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {
        }
        status(message);
    }

    private void notifyFrame(int type, byte[] payload) throws InterruptedException {
        if (gattServer == null || connectedDevice == null || txCharacteristic == null || !notificationsEnabled) {
            throw new IllegalStateException("Bluetooth connection is not ready.");
        }
        byte[] frame = new byte[1 + payload.length];
        frame[0] = (byte) type;
        System.arraycopy(payload, 0, frame, 1, payload.length);

        synchronized (notificationLock) {
            notificationPending = true;
            notificationStatus = BluetoothGatt.GATT_SUCCESS;

            if (Build.VERSION.SDK_INT >= 33) {
                int result = gattServer.notifyCharacteristicChanged(connectedDevice, txCharacteristic, false, frame);
                if (result != 0) {
                    notificationPending = false;
                    throw new IllegalStateException("Bluetooth notification failed.");
                }
            } else {
                txCharacteristic.setValue(frame);
                if (!gattServer.notifyCharacteristicChanged(connectedDevice, txCharacteristic, false)) {
                    notificationPending = false;
                    throw new IllegalStateException("Bluetooth notification failed.");
                }
            }

            long deadline = System.currentTimeMillis() + NOTIFICATION_TIMEOUT_MS;
            while (notificationPending && running) {
                long remaining = deadline - System.currentTimeMillis();
                if (remaining <= 0) break;
                notificationLock.wait(remaining);
            }
            if (notificationPending) {
                notificationPending = false;
                throw new IllegalStateException("Bluetooth notification timed out.");
            }
            if (notificationStatus != BluetoothGatt.GATT_SUCCESS) {
                throw new IllegalStateException("Bluetooth notification failed with status " + notificationStatus + ".");
            }
        }
    }

    private void status(String message) {
        Log.d("ListySync", message);
        listener.onStatus(message);
    }

    private String advertisingFailureReason(int errorCode) {
        if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE) {
            return "the Bluetooth packet is too large";
        }
        if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS) {
            return "Android says too many apps are advertising Bluetooth right now. Turn Bluetooth off and on, then tap Try again";
        }
        if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED) {
            return "Android says sync advertising is already running. Tap Try again";
        }
        if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR) {
            return "Android hit an internal Bluetooth error. Turn Bluetooth off and on, then tap Try again";
        }
        if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED) {
            return "this phone does not support Bluetooth LE advertising";
        }
        return "Android returned advertising error " + errorCode;
    }
}
