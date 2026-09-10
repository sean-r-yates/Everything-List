package local.shoppinglist.android;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.text.style.ForegroundColorSpan;
import android.text.style.StyleSpan;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final String PREFS = "shoppinglist_native";
    private static final int REQUEST_IMPORT_SYNC_BUNDLE = 7001;
    private static final int REQUEST_EXPORT_SYNC_BUNDLE = 7002;
    private static final int REQUEST_BLUETOOTH_SYNC_PERMISSIONS = 7003;
    private static final String ACTIVE_PROFILE_ID = "active_profile_id";
    private static final String APP_COLOR = "app_color";
    private static final String DARK_MODE = "dark_mode";
    private static final String PC_SYNC_URL = "pc_sync_url";
    private static final String[] LIST_TYPES = {"shopping", "games", "shows", "locations"};
    private static final String[] LIST_LABELS = {"Shopping", "Gaming", "Movies & Shows", "Locations"};
    private static final String[] QUICK_FILTERS = {"all", "priced", "missing-price", "with-notes", "in-progress"};
    private static final String[] QUICK_FILTER_LABELS = {"Everything", "Has price", "Missing price", "With notes", "In progress"};
    private static final String[] SORTS = {"newest", "price-low", "price-high", "name", "site", "eta"};
    private static final String[] SORT_LABELS = {"Newest", "Price low", "Price high", "Name", "Site", "Delivery"};
    private static final String[] VIEW_MODES = {"cards", "images"};
    private static final String[] VIEW_LABELS = {"Cards", "Pictures"};
    private static final String[] PROFILE_COLOR_PRESETS = {
        "#b89d6b", "#d18fcd", "#6a9c89", "#6f86d6", "#d47f5f", "#8f73c8"
    };
    private static final Pattern URL_PATTERN = Pattern.compile("https?://\\S+");
    private static final String[] APP_COLOR_PRESETS = {
        "#3f4e57", "#253447", "#315f5b", "#4e4269", "#6a3d4d", "#3f5d46"
    };

    private static final int RAIL = Color.rgb(63, 78, 87);
    private static final int RAIL_DARK = Color.rgb(51, 66, 74);
    private static final int PAPER = Color.WHITE;
    private static final int TAG_WASH = Color.rgb(241, 241, 240);
    private static final int INK = Color.rgb(36, 44, 44);
    private static final int SOFT_INK = Color.rgb(91, 102, 102);
    private static final int MUTED = Color.rgb(138, 147, 144);
    private static final int LINE = Color.rgb(232, 229, 222);
    private static final int ACCENT = Color.rgb(184, 157, 107);
    private static final int RED = Color.rgb(169, 91, 79);

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private ShoppingStore store;
    private SharedPreferences prefs;
    private int appColor = RAIL;
    private boolean darkMode = false;
    private FrameLayout shellRoot;
    private LinearLayout rootLayout;
    private LinearLayout titlebarView;
    private LinearLayout bodyLayout;
    private LinearLayout panelView;
    private HorizontalScrollView tagScrollView;
    private LinearLayout profileRail;
    private LinearLayout profileRailList;
    private TextView railSettingsButton;
    private TextView brandTitle;
    private TextView sectionSwitchButton;
    private LinearLayout statusTabRow;
    private LinearLayout tagTabRow;
    private LinearLayout advancedSearchPanel;
    private EditText searchInput;
    private GridLayout itemGrid;
    private TextView emptyText;
    private Button railToggleButton;
    private ImageView advancedToggleButton;
    private TextView addItemButton;
    private boolean railOpen = false;
    private boolean advancedSearchOpen = false;
    private boolean profileGestureActive = false;
    private float swipeStartX;
    private float swipeStartY;
    private long activeProfileId;
    private String activeListType = "shopping";
    private String statusFilter = "all";
    private String tagFilter = "";
    private String quickFilter = "all";
    private String sortMode = "newest";
    private String viewMode = "cards";
    private String search = "";
    private String pendingSyncBundle = "";
    private BluetoothSyncServer bluetoothSyncServer;
    private AlertDialog bluetoothSyncDialog;
    private TextView bluetoothSyncStatusText;
    private final Handler bluetoothSyncHandler = new Handler(Looper.getMainLooper());
    private int bluetoothSyncStartToken = 0;
    private View stickyToastView;
    private List<ShoppingStore.Profile> profiles = new ArrayList<>();
    private List<ShoppingStore.Item> visibleItems = new ArrayList<>();

    private interface ColorChangeListener {
        void onChanged(String color);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        loadAppearance();
        store = new ShoppingStore(this);
        store.ensureSeeded();
        buildLayout();
        loadProfiles();
        refreshItems();
        if (!handleIncomingShare(getIntent())) {
            showSectionChooser();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingShare(intent);
    }

    private boolean handleIncomingShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) {
            return false;
        }

        String url = extractSharedUrl(intent);
        if (blank(url)) {
            toast("Listy could not find a link in that share.");
            return true;
        }

        closeRail();
        if (sectionSwitchButton != null) {
            sectionSwitchButton.setText(listLabel(activeListType));
        }
        showItemDialog(null, url, true);
        return true;
    }

    private String extractSharedUrl(Intent intent) {
        CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        String source = text == null ? "" : text.toString();
        if (blank(source)) {
            source = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        }

        Matcher matcher = URL_PATTERN.matcher(source == null ? "" : source);
        if (!matcher.find()) {
            return "";
        }

        String url = matcher.group();
        while (url.endsWith(".") || url.endsWith(",") || url.endsWith(")") || url.endsWith("]")) {
            url = url.substring(0, url.length() - 1);
        }
        return url;
    }

    @Override
    protected void onDestroy() {
        stopBluetoothSync();
        executor.shutdownNow();
        store.close();
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_IMPORT_SYNC_BUNDLE && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                importSyncBundle(uri);
            }
        } else if (requestCode == REQUEST_EXPORT_SYNC_BUNDLE && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                writeSyncBundle(uri);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_BLUETOOTH_SYNC_PERMISSIONS) return;
        boolean granted = grantResults.length > 0;
        for (int result : grantResults) {
            if (result != PackageManager.PERMISSION_GRANTED) {
                granted = false;
                break;
            }
        }
        if (granted) {
            startBluetoothSync();
        } else {
            toast("Bluetooth sync needs Nearby devices permission.");
        }
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        if (profileGestureActive) {
            return super.dispatchTouchEvent(event);
        }
        if (event.getAction() == MotionEvent.ACTION_DOWN) {
            swipeStartX = event.getX();
            swipeStartY = event.getY();
        } else if (event.getAction() == MotionEvent.ACTION_UP) {
            float dx = event.getX() - swipeStartX;
            float dy = Math.abs(event.getY() - swipeStartY);
            if (railOpen && swipeStartX > dp(86) && Math.abs(dx) <= dp(14) && dy <= dp(14)) {
                closeRail();
                return true;
            }
            if (!railOpen && dx >= dp(72) && dy <= dp(80)) {
                openRail();
                return true;
            }
            if (railOpen && swipeStartX > dp(86) && dx <= -dp(72) && dy <= dp(80)) {
                closeRail();
                return true;
            }
        }
        return super.dispatchTouchEvent(event);
    }

    private void buildLayout() {
        FrameLayout shell = new FrameLayout(this);
        shell.setBackgroundColor(appColor);
        shellRoot = shell;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(appColor);
        rootLayout = root;

        LinearLayout titlebar = new LinearLayout(this);
        titlebar.setBackgroundColor(appColor);
        titlebarView = titlebar;
        root.addView(titlebar, new LinearLayout.LayoutParams(-1, dp(34)));

        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.HORIZONTAL);
        body.setBackgroundColor(appColor);
        bodyLayout = body;

        LinearLayout rail = new LinearLayout(this);
        rail.setOrientation(LinearLayout.VERTICAL);
        rail.setGravity(Gravity.CENTER_HORIZONTAL);
        rail.setPadding(dp(7), dp(10), dp(7), dp(10));
        rail.setBackgroundColor(appColor);
        profileRail = rail;

        TextView railTitle = text("Profiles", 13, Color.rgb(234, 240, 239));
        railTitle.setGravity(Gravity.CENTER);
        railTitle.setAlpha(0.84f);
        rail.addView(railTitle, new LinearLayout.LayoutParams(-1, dp(30)));

        profileRailList = new LinearLayout(this);
        profileRailList.setOrientation(LinearLayout.VERTICAL);
        profileRailList.setGravity(Gravity.CENTER_HORIZONTAL);
        rail.addView(profileRailList, new LinearLayout.LayoutParams(-1, -2));

        TextView addProfile = railIcon("+", 25, Color.TRANSPARENT, Color.WHITE);
        addProfile.setOnClickListener(v -> showProfileDialog());
        LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(dp(48), dp(48));
        addParams.setMargins(0, dp(8), 0, dp(4));
        rail.addView(addProfile, addParams);

        View railSpacer = new View(this);
        rail.addView(railSpacer, new LinearLayout.LayoutParams(-1, 0, 1));

        TextView settings = railIcon("\u2699", 20, appColorDark(), Color.WHITE);
        railSettingsButton = settings;
        settings.setOnClickListener(v -> showSettings());
        LinearLayout.LayoutParams settingsParams = new LinearLayout.LayoutParams(dp(48), dp(48));
        settingsParams.setMargins(0, dp(6), 0, 0);
        rail.addView(settings, settingsParams);
        body.addView(profileRail, new LinearLayout.LayoutParams(dp(86), -1));

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackground(rounded(paperColor(), 20));
        panelView = panel;
        panel.setOnClickListener(v -> {
            if (railOpen) closeRail();
        });

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.VERTICAL);
        top.setPadding(dp(14), dp(16), dp(14), dp(10));

        LinearLayout brandRow = new LinearLayout(this);
        brandRow.setGravity(Gravity.CENTER_VERTICAL);
        brandRow.setOrientation(LinearLayout.HORIZONTAL);
        brandTitle = text("", 26, textColor());
        brandTitle.setSingleLine(true);
        brandTitle.setEllipsize(TextUtils.TruncateAt.END);
        brandRow.addView(brandTitle, new LinearLayout.LayoutParams(0, -2, 1));
        sectionSwitchButton = chip(listLabel(activeListType), true, true);
        sectionSwitchButton.setOnClickListener(v -> showSectionChooser());
        LinearLayout.LayoutParams sectionParams = new LinearLayout.LayoutParams(-2, dp(34));
        sectionParams.setMargins(dp(8), 0, 0, 0);
        brandRow.addView(sectionSwitchButton, sectionParams);
        top.addView(brandRow, new LinearLayout.LayoutParams(-1, -2));

        HorizontalScrollView statusScroll = new HorizontalScrollView(this);
        statusScroll.setHorizontalScrollBarEnabled(false);
        statusTabRow = new LinearLayout(this);
        statusTabRow.setOrientation(LinearLayout.HORIZONTAL);
        statusTabRow.setGravity(Gravity.CENTER_VERTICAL);
        statusScroll.addView(statusTabRow);
        top.addView(statusScroll, new LinearLayout.LayoutParams(-1, dp(46)));
        panel.addView(top);

        HorizontalScrollView tagScroll = new HorizontalScrollView(this);
        tagScroll.setHorizontalScrollBarEnabled(false);
        tagScroll.setBackgroundColor(tagWashColor());
        tagScrollView = tagScroll;
        tagTabRow = new LinearLayout(this);
        tagTabRow.setOrientation(LinearLayout.HORIZONTAL);
        tagTabRow.setGravity(Gravity.CENTER_VERTICAL);
        tagTabRow.setPadding(dp(10), dp(6), dp(10), dp(6));
        tagScroll.addView(tagTabRow);
        panel.addView(tagScroll, new LinearLayout.LayoutParams(-1, dp(48)));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.VERTICAL);
        toolbar.setPadding(dp(14), dp(12), dp(14), dp(8));

        LinearLayout searchRow = new LinearLayout(this);
        searchRow.setOrientation(LinearLayout.HORIZONTAL);
        searchRow.setGravity(Gravity.CENTER_VERTICAL);

        ImageView advancedToggle = filterIconButton(softTextColor());
        advancedToggleButton = advancedToggle;
        LinearLayout.LayoutParams advancedParams = new LinearLayout.LayoutParams(dp(44), dp(44));
        advancedParams.setMargins(0, 0, dp(8), 0);
        searchRow.addView(advancedToggle, advancedParams);

        searchInput = new EditText(this);
        searchInput.setSingleLine(true);
        searchInput.setHint(searchHint(activeListType));
        searchInput.setImeOptions(EditorInfo.IME_ACTION_SEARCH);
        searchInput.setTextSize(14);
        searchInput.setPadding(dp(12), 0, dp(12), 0);
        searchInput.setTextColor(textColor());
        searchInput.setHintTextColor(mutedTextColor());
        searchInput.setBackground(roundedStroke(fieldColor(), 10, lineColor(), 1));
        searchRow.addView(searchInput, new LinearLayout.LayoutParams(0, dp(44), 1));
        toolbar.addView(searchRow, new LinearLayout.LayoutParams(-1, dp(44)));

        advancedSearchPanel = new LinearLayout(this);
        advancedSearchPanel.setOrientation(LinearLayout.VERTICAL);
        advancedSearchPanel.setPadding(dp(10), dp(10), dp(10), dp(8));
        advancedSearchPanel.setBackground(roundedStroke(cardColor(), 12, lineColor(), 1));
        advancedSearchPanel.setVisibility(View.GONE);

        Spinner filterSpinner = spinner(QUICK_FILTER_LABELS);
        filterSpinner.setSelection(indexOf(QUICK_FILTERS, quickFilter));
        filterSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                String next = QUICK_FILTERS[Math.max(0, Math.min(position, QUICK_FILTERS.length - 1))];
                if (!quickFilter.equals(next)) {
                    quickFilter = next;
                    refreshItems();
                }
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
        advancedSearchPanel.addView(labeled("Filter", filterSpinner));

        Spinner sortSpinner = spinner(SORT_LABELS);
        sortSpinner.setSelection(indexOf(SORTS, sortMode));
        sortSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                String next = SORTS[Math.max(0, Math.min(position, SORTS.length - 1))];
                if (!sortMode.equals(next)) {
                    sortMode = next;
                    refreshItems();
                }
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
        advancedSearchPanel.addView(labeled("Sort by", sortSpinner));

        Spinner viewSpinner = spinner(VIEW_LABELS);
        viewSpinner.setSelection(indexOf(VIEW_MODES, viewMode));
        viewSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                String next = VIEW_MODES[Math.max(0, Math.min(position, VIEW_MODES.length - 1))];
                if (!viewMode.equals(next)) {
                    viewMode = next;
                    renderItems();
                }
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
        advancedSearchPanel.addView(labeled("View", viewSpinner));
        toolbar.addView(advancedSearchPanel, new LinearLayout.LayoutParams(-1, -2));

        advancedToggle.setOnClickListener(v -> {
            advancedSearchOpen = !advancedSearchOpen;
            advancedSearchPanel.setVisibility(advancedSearchOpen ? View.VISIBLE : View.GONE);
        });
        panel.addView(toolbar);

        emptyText = text("No items here yet.", 15, softTextColor());
        emptyText.setGravity(Gravity.CENTER);
        emptyText.setVisibility(View.GONE);
        panel.addView(emptyText, new LinearLayout.LayoutParams(-1, dp(38)));

        ScrollView scroll = new ScrollView(this);
        itemGrid = new GridLayout(this);
        itemGrid.setColumnCount(2);
        itemGrid.setPadding(dp(10), dp(10), dp(10), dp(28));
        scroll.addView(itemGrid);
        panel.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout.LayoutParams panelParams = new LinearLayout.LayoutParams(0, -1, 1);
        panelParams.setMargins(0, 0, 0, 0);
        body.addView(panel, panelParams);
        root.addView(body, new LinearLayout.LayoutParams(-1, 0, 1));

        shell.addView(root, new FrameLayout.LayoutParams(-1, -1));

        railToggleButton = floatingButton("\u2630", 24, appColorDark(), Color.WHITE);
        railToggleButton.setOnClickListener(v -> toggleRail());
        FrameLayout.LayoutParams toggleParams = new FrameLayout.LayoutParams(dp(54), dp(54), Gravity.START | Gravity.BOTTOM);
        toggleParams.setMargins(dp(12), 0, 0, dp(12));
        shell.addView(railToggleButton, toggleParams);

        addItemButton = floatingTextButton("+", 28, ACCENT, Color.WHITE);
        addItemButton.setOnClickListener(v -> showItemDialog(null));
        FrameLayout.LayoutParams addItemParams = new FrameLayout.LayoutParams(dp(58), dp(58), Gravity.END | Gravity.BOTTOM);
        addItemParams.setMargins(0, 0, dp(14), dp(12));
        shell.addView(addItemButton, addItemParams);

        updateRailVisibility();
        setContentView(shell);

        searchInput.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                search = s.toString();
                refreshItems();
            }
            @Override public void afterTextChanged(Editable s) {}
        });
    }

    private void loadProfiles() {
        profiles = store.profiles();
        long saved = prefs.getLong(ACTIVE_PROFILE_ID, 0);
        activeProfileId = 0;
        for (ShoppingStore.Profile profile : profiles) {
            if (profile.id == saved) {
                activeProfileId = profile.id;
                break;
            }
        }
        if (activeProfileId == 0 && !profiles.isEmpty()) {
            activeProfileId = profiles.get(0).id;
            prefs.edit().putLong(ACTIVE_PROFILE_ID, activeProfileId).apply();
        }
        renderProfiles();
        renderBrandTitle();
        updateAccentTargets();
    }

    private void showSectionChooser() {
        LinearLayout content = dialogForm();
        TextView prompt = text("Choose what you want to track.", 14, softTextColor());
        prompt.setPadding(0, 0, 0, dp(8));
        content.addView(prompt);

        AlertDialog dialog = new AlertDialog.Builder(this).create();
        for (int i = 0; i < LIST_TYPES.length; i++) {
            final String type = LIST_TYPES[i];
            Button button = dialogButton(LIST_LABELS[i], type.equals(activeListType), activeAccentColor());
            button.setGravity(Gravity.CENTER_VERTICAL);
            button.setOnClickListener(v -> {
                setActiveListType(type);
                dialog.dismiss();
            });
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(48));
            params.setMargins(0, 0, 0, dp(8));
            content.addView(button, params);
        }

        LinearLayout actions = new LinearLayout(this);
        dialog.setView(compactDialogShell("Listy", activeAccentColor(), content, actions), 0, 0, 0, 0);
        dialog.setCancelable(false);
        dialog.setCanceledOnTouchOutside(false);
        dialog.show();
        styleCompactDialogWindow(dialog);
    }

    private void setActiveListType(String type) {
        activeListType = cleanListType(type);
        statusFilter = "all";
        tagFilter = "";
        quickFilter = "all";
        search = "";
        if (searchInput != null) {
            searchInput.setText("");
            searchInput.setHint(searchHint(activeListType));
        }
        renderBrandTitle();
        refreshItems();
    }

    private void toggleRail() {
        if (railOpen) {
            closeRail();
        } else {
            openRail();
        }
    }

    private void openRail() {
        railOpen = true;
        updateRailVisibility();
    }

    private void closeRail() {
        railOpen = false;
        updateRailVisibility();
    }

    private void updateRailVisibility() {
        if (profileRail != null) {
            profileRail.setVisibility(railOpen ? View.VISIBLE : View.GONE);
        }
        if (railToggleButton != null) {
            railToggleButton.setVisibility(railOpen ? View.GONE : View.VISIBLE);
        }
        if (addItemButton != null) {
            addItemButton.setVisibility(View.VISIBLE);
        }
        if (itemGrid != null && activeProfileId > 0) {
            renderItems();
        }
    }

    private void renderProfiles() {
        profileRailList.removeAllViews();
        for (ShoppingStore.Profile profile : profiles) {
            profileRailList.addView(profileCard(profile));
        }
    }

    private void renderBrandTitle() {
        if (brandTitle == null) return;
        ShoppingStore.Profile profile = currentProfile();
        int accent = activeAccentColor();
        String owner = profile == null ? "Profile" : profile.name;
        String title = owner + " " + listLabel(activeListType) + " List";
        SpannableStringBuilder styled = new SpannableStringBuilder(title);
        if (profile != null) {
            styled.setSpan(new ForegroundColorSpan(accent), 0, owner.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            styled.setSpan(new StyleSpan(Typeface.BOLD), 0, owner.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
        int listStart = title.length() - "List".length();
        styled.setSpan(new ForegroundColorSpan(accent), listStart, title.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        styled.setSpan(new StyleSpan(Typeface.BOLD), listStart, title.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        brandTitle.setTextColor(textColor());
        brandTitle.setText(styled);
        if (sectionSwitchButton != null) {
            sectionSwitchButton.setText(listLabel(activeListType));
            sectionSwitchButton.setTextColor(activeAccentColor());
            sectionSwitchButton.setBackground(roundedStroke(chipSelectedColor(), 999, activeAccentColor(), 1));
        }
    }

    private ShoppingStore.Profile currentProfile() {
        for (ShoppingStore.Profile profile : profiles) {
            if (profile.id == activeProfileId) return profile;
        }
        return profiles.isEmpty() ? null : profiles.get(0);
    }

    private String cleanListType(String type) {
        String value = type == null ? "" : type.toLowerCase(Locale.ROOT).trim();
        for (String known : LIST_TYPES) {
            if (known.equals(value)) return known;
        }
        return "shopping";
    }

    private String listLabel(String type) {
        String value = cleanListType(type);
        for (int i = 0; i < LIST_TYPES.length; i++) {
            if (LIST_TYPES[i].equals(value)) return LIST_LABELS[i];
        }
        return "Shopping";
    }

    private int listTypeIndex(String type) {
        String value = cleanListType(type);
        for (int i = 0; i < LIST_TYPES.length; i++) {
            if (LIST_TYPES[i].equals(value)) return i;
        }
        return 0;
    }

    private String[] statusValues(String type) {
        String value = cleanListType(type);
        if ("games".equals(value)) return new String[]{"all", "wanted", "playing", "finished", "dropped", "bought"};
        if ("shows".equals(value)) return new String[]{"all", "want_to_watch", "watching", "finished", "dropped"};
        if ("locations".equals(value)) return new String[]{"all", "want_to_go", "planned", "visited"};
        return new String[]{"all", "wanted", "maybe", "bought", "ordered"};
    }

    private String[] statusLabels(String type) {
        String value = cleanListType(type);
        if ("games".equals(value)) return new String[]{"All", "Wanted", "Playing", "Finished", "Dropped", "Bought"};
        if ("shows".equals(value)) return new String[]{"All", "Want to watch", "Watching", "Finished", "Dropped"};
        if ("locations".equals(value)) return new String[]{"All", "Want to go", "Planned", "Visited"};
        return new String[]{"All", "Wanted", "Maybe", "Bought", "Ordered"};
    }

    private String[] editorStatusLabels(String type) {
        String[] labels = statusLabels(type);
        String[] editorLabels = new String[Math.max(0, labels.length - 1)];
        System.arraycopy(labels, 1, editorLabels, 0, editorLabels.length);
        return editorLabels;
    }

    private String defaultStatus(String type) {
        String value = cleanListType(type);
        if ("shows".equals(value)) return "want_to_watch";
        if ("locations".equals(value)) return "want_to_go";
        return "wanted";
    }

    private String linkLabel(String type) {
        String value = cleanListType(type);
        if ("games".equals(value)) return "Game link";
        if ("shows".equals(value)) return "Movie or show link";
        if ("locations".equals(value)) return "Map link";
        return "Product link";
    }

    private String searchHint(String type) {
        String value = cleanListType(type);
        if ("games".equals(value)) return "Search gaming, platforms, tags...";
        if ("shows".equals(value)) return "Search movies, shows, tags, notes...";
        if ("locations".equals(value)) return "Search locations, tags, maps...";
        return "Search products, tags, sites, orders...";
    }

    private String[] profileLabels() {
        if (profiles.isEmpty()) return new String[]{"Me"};
        String[] labels = new String[profiles.size()];
        for (int i = 0; i < profiles.size(); i++) {
            labels[i] = profiles.get(i).name == null || profiles.get(i).name.trim().isEmpty()
                ? "Profile"
                : profiles.get(i).name;
        }
        return labels;
    }

    private int profileIndexForId(long profileId) {
        for (int i = 0; i < profiles.size(); i++) {
            if (profiles.get(i).id == profileId) return i;
        }
        return 0;
    }

    private long profileIdAt(int index) {
        if (profiles.isEmpty()) return activeProfileId;
        if (index < 0 || index >= profiles.size()) return profiles.get(0).id;
        return profiles.get(index).id;
    }

    private int activeAccentColor() {
        ShoppingStore.Profile profile = currentProfile();
        return profile == null ? ACCENT : parseColor(profile.accent, ACCENT);
    }

    private void updateAccentTargets() {
        if (addItemButton != null) {
            addItemButton.setBackground(rounded(activeAccentColor(), 999));
        }
    }

    private View profileCard(ShoppingStore.Profile profile) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(dp(4), dp(7), dp(4), dp(7));
        card.setBackground(rounded(profile.id == activeProfileId ? appColorDark() : Color.TRANSPARENT, 8));
        card.setOnTouchListener(profileTouchListener(profile));

        FrameLayout avatarWrap = new FrameLayout(this);
        TextView avatar = text(initial(profile.name), 20, Color.WHITE);
        avatar.setTypeface(Typeface.DEFAULT_BOLD);
        avatar.setGravity(Gravity.CENTER);
        avatar.setBackground(rounded(parseColor(profile.accent, ACCENT), 999));
        FrameLayout.LayoutParams avatarParams = new FrameLayout.LayoutParams(dp(48), dp(48), Gravity.CENTER);
        avatarWrap.addView(avatar, avatarParams);
        card.addView(avatarWrap, new LinearLayout.LayoutParams(-1, dp(52)));

        TextView name = text(profile.name, 12, Color.WHITE);
        name.setGravity(Gravity.CENTER);
        name.setSingleLine(true);
        name.setEllipsize(TextUtils.TruncateAt.END);
        name.setPadding(0, dp(5), 0, 0);
        card.addView(name, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(88));
        params.setMargins(0, dp(4), 0, dp(4));
        card.setLayoutParams(params);
        return card;
    }

    private View.OnTouchListener profileTouchListener(ShoppingStore.Profile profile) {
        return new View.OnTouchListener() {
            private final Handler handler = new Handler(Looper.getMainLooper());
            private final int touchSlop = Math.max(dp(8), ViewConfiguration.get(MainActivity.this).getScaledTouchSlop());
            private float downRawX;
            private float downRawY;
            private boolean dragReady;
            private boolean dragging;
            private Runnable holdRunnable;

            @Override
            public boolean onTouch(View view, MotionEvent event) {
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downRawX = event.getRawX();
                        downRawY = event.getRawY();
                        dragReady = false;
                        dragging = false;
                        profileGestureActive = true;
                        view.setPressed(true);
                        if (view.getParent() != null) {
                            view.getParent().requestDisallowInterceptTouchEvent(true);
                        }
                        holdRunnable = () -> {
                            dragReady = true;
                            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
                            showProfileDragCue(profile, view);
                        };
                        handler.postDelayed(holdRunnable, ViewConfiguration.getLongPressTimeout());
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = event.getRawX() - downRawX;
                        float dy = event.getRawY() - downRawY;
                        if (!dragReady) {
                            if (Math.abs(dx) > touchSlop || Math.abs(dy) > touchSlop) {
                                cancelProfileHold();
                            }
                            return true;
                        }
                        if (!dragging && Math.abs(dy) > touchSlop / 2f) {
                            dragging = true;
                        }
                        if (dragging) {
                            moveProfileTo(profile.id, profileIndexForY(event.getRawY(), view), view);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        cancelProfileHold();
                        view.setPressed(false);
                        if (dragging) {
                            clearProfileDragCue(profile, view);
                            store.reorderProfiles(profileIds());
                            loadProfiles();
                        } else if (dragReady) {
                            clearProfileDragCue(profile, view);
                            showProfileMenu(profile, view);
                        } else {
                            selectProfile(profile);
                        }
                        if (view.getParent() != null) {
                            view.getParent().requestDisallowInterceptTouchEvent(false);
                        }
                        profileGestureActive = false;
                        return true;
                    case MotionEvent.ACTION_CANCEL:
                        cancelProfileHold();
                        view.setPressed(false);
                        clearProfileDragCue(profile, view);
                        if (view.getParent() != null) {
                            view.getParent().requestDisallowInterceptTouchEvent(false);
                        }
                        profileGestureActive = false;
                        return true;
                    default:
                        return true;
                }
            }

            private void cancelProfileHold() {
                if (holdRunnable != null) {
                    handler.removeCallbacks(holdRunnable);
                    holdRunnable = null;
                }
            }
        };
    }

    private void showProfileDragCue(ShoppingStore.Profile profile, View view) {
        int fill = profile.id == activeProfileId ? appColorDark() : Color.TRANSPARENT;
        int accent = parseColor(profile.accent, ACCENT);
        view.setBackground(roundedStroke(fill, 10, accent, 2));
        view.setElevation(dp(8));
        view.animate()
            .scaleX(1.06f)
            .scaleY(1.06f)
            .alpha(0.9f)
            .setDuration(120)
            .start();
    }

    private void clearProfileDragCue(ShoppingStore.Profile profile, View view) {
        view.animate().cancel();
        view.setScaleX(1f);
        view.setScaleY(1f);
        view.setAlpha(1f);
        view.setElevation(0f);
        view.setBackground(rounded(profile.id == activeProfileId ? appColorDark() : Color.TRANSPARENT, 8));
    }

    private void selectProfile(ShoppingStore.Profile profile) {
        activeProfileId = profile.id;
        prefs.edit().putLong(ACTIVE_PROFILE_ID, activeProfileId).apply();
        tagFilter = "";
        closeRail();
        renderProfiles();
        renderBrandTitle();
        updateAccentTargets();
        refreshItems();
    }

    private void showProfileMenu(ShoppingStore.Profile profile, View anchor) {
        PopupMenu menu = new PopupMenu(this, anchor);
        menu.getMenu().add("Edit");
        menu.getMenu().add("Delete");
        menu.setOnMenuItemClickListener(item -> {
            String label = String.valueOf(item.getTitle());
            if ("Edit".equals(label)) {
                showProfileDialog(profile);
            } else if ("Delete".equals(label)) {
                confirmDeleteProfile(profile, null);
            }
            return true;
        });
        menu.show();
    }

    private int profileIndexForY(float rawY, View draggedCard) {
        if (profileRailList == null || profileRailList.getChildCount() == 0) return 0;
        int[] location = new int[2];
        int insertionIndex = 0;
        for (int i = 0; i < profileRailList.getChildCount(); i++) {
            View child = profileRailList.getChildAt(i);
            if (child == draggedCard) continue;
            child.getLocationOnScreen(location);
            if (rawY < location[1] + child.getHeight() / 2f) {
                return insertionIndex;
            }
            insertionIndex++;
        }
        return insertionIndex;
    }

    private void moveProfileTo(long profileId, int targetIndex, View card) {
        int fromIndex = profileIndex(profileId);
        if (fromIndex < 0 || targetIndex < 0 || targetIndex == fromIndex) return;
        targetIndex = Math.min(targetIndex, profiles.size() - 1);
        ShoppingStore.Profile moved = profiles.remove(fromIndex);
        profiles.add(targetIndex, moved);
        profileRailList.removeView(card);
        profileRailList.addView(card, targetIndex);
    }

    private int profileIndex(long profileId) {
        for (int i = 0; i < profiles.size(); i++) {
            if (profiles.get(i).id == profileId) return i;
        }
        return -1;
    }

    private List<Long> profileIds() {
        List<Long> ids = new ArrayList<>();
        for (ShoppingStore.Profile profile : profiles) {
            ids.add(profile.id);
        }
        return ids;
    }

    private void refreshItems() {
        if (activeProfileId <= 0) return;
        renderStatusTabs();
        List<ShoppingStore.Item> baseItems = store.items(activeProfileId, activeListType, statusFilter, search);
        baseItems = applyQuickFilter(baseItems);
        sortItems(baseItems);
        renderTags(baseItems);
        visibleItems = filterByTag(baseItems);
        renderItems();
    }

    private void renderStatusTabs() {
        statusTabRow.removeAllViews();
        String[] values = statusValues(activeListType);
        String[] labels = statusLabels(activeListType);
        int[] counts = new int[values.length];
        List<ShoppingStore.Item> allItems = store.items(activeProfileId, activeListType, "all", "");
        counts[0] = allItems.size();
        for (ShoppingStore.Item item : allItems) {
            for (int i = 1; i < values.length; i++) {
                if (values[i].equals(item.status)) counts[i]++;
            }
        }
        if (!contains(values, statusFilter)) {
            statusFilter = "all";
        }
        for (int i = 0; i < values.length; i++) {
            final String value = values[i];
            TextView tab = chip(labels[i] + " " + counts[i], value.equals(statusFilter), false);
            tab.setTextSize(14);
            tab.setTypeface(Typeface.DEFAULT_BOLD);
            tab.setOnClickListener(v -> {
                statusFilter = value;
                tagFilter = "";
                refreshItems();
            });
            statusTabRow.addView(tab);
        }
    }

    private void renderTags(List<ShoppingStore.Item> baseItems) {
        tagTabRow.removeAllViews();
        LinkedHashMap<String, Integer> counts = new LinkedHashMap<>();
        for (ShoppingStore.Item item : baseItems) {
            for (String tag : splitTags(item.tags)) {
                String key = tag.toLowerCase(Locale.ROOT);
                counts.put(key, counts.containsKey(key) ? counts.get(key) + 1 : 1);
            }
        }
        if (!tagFilter.isEmpty() && !counts.containsKey(tagFilter.toLowerCase(Locale.ROOT))) {
            tagFilter = "";
        }
        TextView all = chip("All", tagFilter.isEmpty(), true);
        all.setOnClickListener(v -> {
            tagFilter = "";
            refreshItems();
        });
        tagTabRow.addView(all);
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            String tag = entry.getKey();
            TextView tagChip = chip(tag + " " + entry.getValue(), tag.equalsIgnoreCase(tagFilter), true);
            tagChip.setOnClickListener(v -> {
                tagFilter = tag.equalsIgnoreCase(tagFilter) ? "" : tag;
                refreshItems();
            });
            tagTabRow.addView(tagChip);
        }
        if (counts.isEmpty()) {
            TextView none = text("No tags yet", 13, mutedTextColor());
            none.setPadding(dp(10), 0, 0, 0);
            tagTabRow.addView(none);
        }
    }

    private List<ShoppingStore.Item> filterByTag(List<ShoppingStore.Item> baseItems) {
        if (tagFilter.isEmpty()) return baseItems;
        String needle = normalizeTag(tagFilter);
        List<ShoppingStore.Item> result = new ArrayList<>();
        for (ShoppingStore.Item item : baseItems) {
            for (String tag : splitTags(item.tags)) {
                String normalized = normalizeTag(tag);
                if (normalized.contains(needle) || needle.contains(normalized)) {
                    result.add(item);
                    break;
                }
            }
        }
        return result;
    }

    private List<ShoppingStore.Item> applyQuickFilter(List<ShoppingStore.Item> baseItems) {
        if ("all".equals(quickFilter)) return baseItems;
        List<ShoppingStore.Item> result = new ArrayList<>();
        for (ShoppingStore.Item item : baseItems) {
            if ("priced".equals(quickFilter) && item.priceAmount != null) {
                result.add(item);
            } else if ("missing-price".equals(quickFilter) && item.priceAmount == null) {
                result.add(item);
            } else if ("with-notes".equals(quickFilter) && (!blank(item.notes) || !blank(item.description))) {
                result.add(item);
            } else if ("in-progress".equals(quickFilter) && isActiveItem(item)) {
                result.add(item);
            }
        }
        return result;
    }

    private void sortItems(List<ShoppingStore.Item> items) {
        Collections.sort(items, new Comparator<ShoppingStore.Item>() {
            @Override public int compare(ShoppingStore.Item left, ShoppingStore.Item right) {
                if ("price-low".equals(sortMode)) return comparePrice(left, right, true);
                if ("price-high".equals(sortMode)) return comparePrice(left, right, false);
                if ("name".equals(sortMode)) return compareText(left.title, right.title);
                if ("site".equals(sortMode)) return compareText(domainLabel(left), domainLabel(right));
                if ("eta".equals(sortMode)) return compareText(left.estimatedDelivery, right.estimatedDelivery);
                return compareText(right.updatedAt.isEmpty() ? right.createdAt : right.updatedAt, left.updatedAt.isEmpty() ? left.createdAt : left.updatedAt);
            }
        });
    }

    private boolean isActiveItem(ShoppingStore.Item item) {
        if (!"shopping".equals(item.listType)) {
            return "playing".equals(item.status) || "watching".equals(item.status) || "planned".equals(item.status);
        }
        if (!"ordered".equals(item.status)) return false;
        String state = item.orderStatus == null ? "" : item.orderStatus.toLowerCase(Locale.ROOT);
        return !state.contains("delivered") && !state.contains("cancelled") && !state.contains("canceled");
    }

    private int comparePrice(ShoppingStore.Item left, ShoppingStore.Item right, boolean ascending) {
        if (left.priceAmount == null && right.priceAmount == null) return 0;
        if (left.priceAmount == null) return 1;
        if (right.priceAmount == null) return -1;
        int result = Double.compare(left.priceAmount, right.priceAmount);
        return ascending ? result : -result;
    }

    private int compareText(String left, String right) {
        return safeText(left).compareTo(safeText(right));
    }

    private String domainLabel(ShoppingStore.Item item) {
        return blank(item.sourceDomain) ? domain(item.url) : item.sourceDomain;
    }

    private void renderItems() {
        itemGrid.removeAllViews();
        itemGrid.setColumnCount(2);
        emptyText.setText("No " + listLabel(activeListType).toLowerCase(Locale.ROOT) + " here yet.");
        emptyText.setVisibility(visibleItems.isEmpty() ? View.VISIBLE : View.GONE);
        for (ShoppingStore.Item item : visibleItems) {
            itemGrid.addView(itemCard(item));
        }
    }

    private View itemCard(ShoppingStore.Item item) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(8), dp(8), dp(8), dp(8));
        card.setBackground(roundedStroke(cardColor(), 8, lineColor(), 1));
        card.setElevation(dp(1));
        card.setOnClickListener(v -> showItemDialog(item));

        int railWidth = railOpen ? dp(86) : 0;
        int available = getResources().getDisplayMetrics().widthPixels - railWidth - dp(46);
        int width = Math.max(dp(118), (available - dp(26)) / 2);
        GridLayout.LayoutParams params = new GridLayout.LayoutParams();
        params.width = width;
        params.setMargins(dp(5), dp(5), dp(5), dp(10));
        card.setLayoutParams(params);

        ImageView image = new ImageView(this);
        image.setBackgroundColor(Color.rgb(238, 237, 232));
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        card.addView(image, new LinearLayout.LayoutParams(-1, "images".equals(viewMode) ? dp(132) : dp(106)));
        loadImage(image, item.imageUrl);

        TextView title = text(item.title, 14, textColor());
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setMaxLines("images".equals(viewMode) ? 1 : 2);
        title.setEllipsize(TextUtils.TruncateAt.END);
        title.setPadding(0, dp(8), 0, 0);
        card.addView(title);

        String missingPriceLabel = "shows".equals(item.listType) || "locations".equals(item.listType) ? "Cost missing" : "Price missing";
        TextView price = text(item.priceAmount == null ? missingPriceLabel : price(item.priceAmount, item.currency), 14, textColor());
        price.setTypeface(Typeface.DEFAULT_BOLD);
        price.setPadding(0, dp(4), 0, 0);
        card.addView(price);

        if ("images".equals(viewMode)) return card;

        TextView domain = text(domainLabel(item), 12, mutedTextColor());
        domain.setSingleLine(true);
        domain.setEllipsize(TextUtils.TruncateAt.END);
        domain.setPadding(0, dp(4), 0, 0);
        card.addView(domain);

        TextView tags = text(labelForStatus(item.status, item.listType) + (item.tags.isEmpty() ? "" : " - " + item.tags), 11, Color.rgb(145, 103, 145));
        tags.setSingleLine(true);
        tags.setEllipsize(TextUtils.TruncateAt.END);
        tags.setPadding(0, dp(8), 0, 0);
        card.addView(tags);
        return card;
    }

    private void showItemDialog(ShoppingStore.Item existing) {
        showItemDialog(existing, "", false);
    }

    private void showItemDialog(ShoppingStore.Item existing, String initialUrl, boolean autoFetch) {
        boolean editing = existing != null;
        ShoppingStore.Item item = editing ? copy(existing) : new ShoppingStore.Item();
        if (!editing || item.profileId <= 0) {
            item.profileId = activeProfileId;
        }
        if (item.listType == null || item.listType.trim().isEmpty()) {
            item.listType = activeListType;
        }
        if (item.status == null || item.status.trim().isEmpty()) {
            item.status = defaultStatus(item.listType);
        }
        if (!editing && !blank(initialUrl)) {
            item.url = initialUrl;
            item.sourceDomain = domain(initialUrl);
        }

        int accent = activeAccentColor();
        LinearLayout form = dialogForm();

        ImageView preview = new ImageView(this);
        preview.setBackgroundColor(fieldColor());
        preview.setScaleType(ImageView.ScaleType.CENTER_CROP);
        LinearLayout.LayoutParams previewParams = new LinearLayout.LayoutParams(-1, dp(150));
        previewParams.setMargins(0, 0, 0, dp(10));
        form.addView(preview, previewParams);
        loadImage(preview, item.imageUrl);

        EditText link = input(linkLabel(item.listType), item.url);
        Button fetch = accentButton("Fetch from link", accent);
        EditText title = input("Title", item.title);
        EditText price = input("shopping".equals(item.listType) || "games".equals(item.listType) ? "Price" : "Cost", item.priceAmount == null ? "" : String.valueOf(item.priceAmount));
        EditText currency = input("Currency", item.currency == null || item.currency.isEmpty() ? "EUR" : item.currency);
        Spinner profile = spinner(profileLabels());
        profile.setSelection(profileIndexForId(item.profileId));
        Spinner listType = spinner(LIST_LABELS);
        listType.setSelection(listTypeIndex(item.listType));
        Spinner status = spinner(editorStatusLabels(item.listType));
        status.setSelection(statusIndex(item.status, item.listType));
        EditText tags = input("Tags", item.tags);
        EditText image = input("Image URL", item.imageUrl);
        EditText description = multiInput("Description", item.description);
        EditText notes = multiInput("Notes", item.notes);
        EditText orderStatus = input("Order status", item.orderStatus);
        EditText carrier = input("Carrier", item.carrier);
        EditText trackingNumber = input("Tracking number", item.trackingNumber);
        EditText trackingUrl = input("Tracking URL", item.trackingUrl);
        EditText orderedAt = input("Ordered date", item.orderedAt);
        EditText estimatedDelivery = input("Estimated delivery", item.estimatedDelivery);
        EditText orderNotes = multiInput("Order notes", item.orderNotes);

        form.addView(link);
        form.addView(fetch);
        form.addView(title);
        form.addView(labeled("Profile", profile));
        form.addView(labeled("List", listType));
        form.addView(price);
        form.addView(currency);
        form.addView(labeled("Status", status));
        form.addView(tags);
        form.addView(image);
        form.addView(description);
        form.addView(notes);
        LinearLayout orderGroup = new LinearLayout(this);
        orderGroup.setOrientation(LinearLayout.VERTICAL);
        orderGroup.addView(sectionTitle("Order tracking"));
        orderGroup.addView(orderStatus);
        orderGroup.addView(carrier);
        orderGroup.addView(trackingNumber);
        orderGroup.addView(trackingUrl);
        orderGroup.addView(orderedAt);
        orderGroup.addView(estimatedDelivery);
        orderGroup.addView(orderNotes);
        form.addView(orderGroup);

        final Runnable[] updateOrderVisibility = new Runnable[1];
        updateOrderVisibility[0] = () -> {
            String selectedType = listTypeValue(listType.getSelectedItemPosition());
            String selectedStatus = statusValue(selectedType, status.getSelectedItemPosition());
            orderGroup.setVisibility("shopping".equals(selectedType) && "ordered".equals(selectedStatus) ? View.VISIBLE : View.GONE);
            link.setHint(linkLabel(selectedType));
            price.setHint("shopping".equals(selectedType) || "games".equals(selectedType) ? "Price" : "Cost");
        };
        listType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                String selectedType = listTypeValue(position);
                String currentStatus = statusValue(selectedType, status.getSelectedItemPosition());
                setSpinnerLabels(status, editorStatusLabels(selectedType));
                status.setSelection(statusIndex(currentStatus, selectedType));
                updateOrderVisibility[0].run();
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
        status.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                updateOrderVisibility[0].run();
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
        updateOrderVisibility[0].run();

        AlertDialog dialog = new AlertDialog.Builder(this).create();
        final boolean[] allowDuplicate = {false};
        Button cancelButton = dialogButton("Cancel", false, accent);
        cancelButton.setOnClickListener(v -> dialog.dismiss());
        Button saveButton = dialogButton(editing ? "Save" : "Add", true, accent);
        saveButton.setOnClickListener(v -> {
            String titleText = title.getText().toString().trim();
            if (titleText.isEmpty()) {
                title.setError("Title is required");
                return;
            }
            item.title = titleText;
            item.url = link.getText().toString().trim();
            item.sourceDomain = domain(item.url);
            item.profileId = profileIdAt(profile.getSelectedItemPosition());
            item.listType = listTypeValue(listType.getSelectedItemPosition());
            item.priceAmount = parsePrice(price.getText().toString());
            item.currency = currency.getText().toString().trim().isEmpty() ? "EUR" : currency.getText().toString().trim();
            item.status = statusValue(item.listType, status.getSelectedItemPosition());
            item.tags = tags.getText().toString().trim();
            item.imageUrl = image.getText().toString().trim();
            item.description = description.getText().toString().trim();
            item.notes = notes.getText().toString().trim();
            item.orderStatus = orderStatus.getText().toString().trim();
            item.carrier = carrier.getText().toString().trim();
            item.trackingNumber = trackingNumber.getText().toString().trim();
            item.trackingUrl = trackingUrl.getText().toString().trim();
            item.orderedAt = orderedAt.getText().toString().trim();
            item.estimatedDelivery = estimatedDelivery.getText().toString().trim();
            item.orderNotes = orderNotes.getText().toString().trim();

            if (!editing && !allowDuplicate[0]) {
                List<ShoppingStore.Item> duplicates = store.duplicateItems(item.profileId, item.listType, item.url, item.title, 0);
                if (!duplicates.isEmpty()) {
                    ShoppingStore.Item duplicate = duplicates.get(0);
                    showDuplicateItemDialog(duplicate, () -> {
                        dialog.dismiss();
                        showItemDialog(duplicate);
                    }, () -> {
                        allowDuplicate[0] = true;
                        v.performClick();
                    });
                    return;
                }
            }

            store.saveItem(item);
            activeListType = item.listType;
            refreshItems();
            dialog.dismiss();
            toast(editing ? "Item saved." : "Item added.");
        });

        fetch.setOnClickListener(v -> {
            String url = link.getText().toString().trim();
            if (url.isEmpty()) {
                        link.setError("Paste a link first");
                return;
            }
            fetch.setEnabled(false);
            fetch.setText("Fetching...");
            executor.execute(() -> {
                try {
                    ShoppingStore.Item scraped = ProductScraper.scrape(profileIdAt(profile.getSelectedItemPosition()), url);
                    runOnUiThread(() -> {
                        scraped.listType = listTypeValue(listType.getSelectedItemPosition());
                        title.setText(scraped.title);
                        price.setText(scraped.priceAmount == null ? "" : String.valueOf(scraped.priceAmount));
                        currency.setText(scraped.currency);
                        tags.setText(scraped.tags);
                        image.setText(scraped.imageUrl);
                        description.setText(scraped.description);
                        loadImage(preview, scraped.imageUrl);
                        fetch.setText("Fetch from link");
                        fetch.setEnabled(true);
                    });
                } catch (Exception error) {
                    runOnUiThread(() -> {
                        fetch.setText("Fetch from link");
                        fetch.setEnabled(true);
                        toast("Could not fetch that link. You can still add it manually.");
                    });
                }
            });
        });

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.VERTICAL);
        if (editing) {
            Button deleteButton = dialogButton("Move to Bin", false, RED);
            deleteButton.setTextColor(RED);
            deleteButton.setOnClickListener(v -> showDeleteItemDialog(existing, dialog));
            actions.addView(deleteButton, new LinearLayout.LayoutParams(-1, dp(44)));
        }

        LinearLayout bottomActions = new LinearLayout(this);
        bottomActions.setOrientation(LinearLayout.HORIZONTAL);
        bottomActions.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams cancelParams = new LinearLayout.LayoutParams(0, dp(44), 1);
        cancelParams.setMargins(0, editing ? dp(8) : 0, dp(8), 0);
        bottomActions.addView(cancelButton, cancelParams);
        LinearLayout.LayoutParams saveParams = new LinearLayout.LayoutParams(0, dp(44), 1);
        saveParams.setMargins(dp(8), editing ? dp(8) : 0, 0, 0);
        bottomActions.addView(saveButton, saveParams);
        actions.addView(bottomActions);

        dialog.setView(dialogShell(editing ? "Edit item" : "Add item", accent, form, actions), 0, 0, 0, 0);
        dialog.show();
        styleDialogWindow(dialog);
        if (autoFetch && !blank(item.url)) {
            fetch.performClick();
        }
    }

    private void showDuplicateItemDialog(ShoppingStore.Item item, Runnable openExisting, Runnable addAnyway) {
        int accent = activeAccentColor();
        LinearLayout content = dialogForm();

        TextView lead = text("This looks like something already saved.", 13, softTextColor());
        lead.setPadding(0, 0, 0, dp(10));
        content.addView(lead);

        LinearLayout preview = new LinearLayout(this);
        preview.setOrientation(LinearLayout.HORIZONTAL);
        preview.setGravity(Gravity.CENTER_VERTICAL);
        preview.setPadding(dp(10), dp(10), dp(10), dp(10));
        preview.setBackground(roundedStroke(fieldColor(), 10, lineColor(), 1));

        ImageView image = new ImageView(this);
        image.setBackgroundColor(cardColor());
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        loadImage(image, item.imageUrl);
        LinearLayout.LayoutParams imageParams = new LinearLayout.LayoutParams(dp(68), dp(68));
        imageParams.setMargins(0, 0, dp(12), 0);
        preview.addView(image, imageParams);

        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        TextView title = text(item.title == null || item.title.trim().isEmpty() ? "Untitled item" : item.title, 15, textColor());
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setMaxLines(2);
        title.setEllipsize(TextUtils.TruncateAt.END);
        copy.addView(title);

        String meta = labelForStatus(item.status, item.listType);
        String priceText = item.priceAmount == null ? "" : price(item.priceAmount, item.currency);
        if (!priceText.isEmpty()) meta += " | " + priceText;
        String site = domainLabel(item);
        if (!site.isEmpty()) meta += " | " + site;
        TextView details = text(meta, 12, mutedTextColor());
        details.setMaxLines(2);
        details.setEllipsize(TextUtils.TruncateAt.END);
        details.setPadding(0, dp(4), 0, 0);
        copy.addView(details);

        preview.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));
        content.addView(preview);

        AlertDialog duplicateDialog = new AlertDialog.Builder(this).create();
        Button open = dialogButton("Open existing", true, accent);
        Button add = dialogButton("Add anyway", false, accent);
        open.setOnClickListener(v -> {
            duplicateDialog.dismiss();
            openExisting.run();
        });
        add.setOnClickListener(v -> {
            duplicateDialog.dismiss();
            addAnyway.run();
        });

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams openParams = new LinearLayout.LayoutParams(0, dp(42), 1);
        openParams.setMargins(0, 0, dp(8), 0);
        actions.addView(open, openParams);
        LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(0, dp(42), 1);
        addParams.setMargins(dp(8), 0, 0, 0);
        actions.addView(add, addParams);

        duplicateDialog.setView(compactDialogShell("Already in Listy", accent, content, actions), 0, 0, 0, 0);
        duplicateDialog.show();
        styleCompactDialogWindow(duplicateDialog);
    }

    private void showDeleteItemDialog(ShoppingStore.Item item, AlertDialog editorDialog) {
        int accent = activeAccentColor();
        LinearLayout content = dialogForm();

        TextView lead = text("This moves the item to Bin, where it can still be restored later.", 13, softTextColor());
        lead.setPadding(0, 0, 0, dp(10));
        content.addView(lead);

        LinearLayout preview = new LinearLayout(this);
        preview.setOrientation(LinearLayout.HORIZONTAL);
        preview.setGravity(Gravity.CENTER_VERTICAL);
        preview.setPadding(dp(10), dp(10), dp(10), dp(10));
        preview.setBackground(roundedStroke(fieldColor(), 10, lineColor(), 1));

        ImageView image = new ImageView(this);
        image.setBackgroundColor(cardColor());
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        loadImage(image, item.imageUrl);
        LinearLayout.LayoutParams imageParams = new LinearLayout.LayoutParams(dp(76), dp(76));
        imageParams.setMargins(0, 0, dp(12), 0);
        preview.addView(image, imageParams);

        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        TextView title = text(item.title == null || item.title.trim().isEmpty() ? "Untitled item" : item.title, 15, textColor());
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setMaxLines(2);
        title.setEllipsize(TextUtils.TruncateAt.END);
        copy.addView(title);

        String profileName = "";
        for (ShoppingStore.Profile profile : profiles) {
            if (profile.id == item.profileId) {
                profileName = profile.name;
                break;
            }
        }
        String meta = (profileName == null || profileName.isEmpty() ? "Saved item" : profileName + "'s list");
        String priceText = item.priceAmount == null ? "" : price(item.priceAmount, item.currency);
        if (!priceText.isEmpty()) meta += " | " + priceText;
        String site = domainLabel(item);
        if (!site.isEmpty()) meta += " | " + site;
        TextView details = text(meta, 12, mutedTextColor());
        details.setMaxLines(2);
        details.setEllipsize(TextUtils.TruncateAt.END);
        details.setPadding(0, dp(4), 0, 0);
        copy.addView(details);
        preview.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));
        content.addView(preview);

        Button keep = dialogButton("Keep item", false, accent);
        Button move = dialogButton("Move to Bin", true, RED);
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams keepParams = new LinearLayout.LayoutParams(0, dp(42), 1);
        keepParams.setMargins(0, 0, dp(8), 0);
        actions.addView(keep, keepParams);
        LinearLayout.LayoutParams moveParams = new LinearLayout.LayoutParams(0, dp(42), 1);
        moveParams.setMargins(dp(8), 0, 0, 0);
        actions.addView(move, moveParams);

        AlertDialog confirmDialog = new AlertDialog.Builder(this).create();
        keep.setOnClickListener(v -> confirmDialog.dismiss());
        move.setOnClickListener(v -> {
            store.deleteItem(item.id);
            refreshItems();
            editorDialog.dismiss();
            confirmDialog.dismiss();
            toast("Item moved to Bin.");
        });
        confirmDialog.setView(compactDialogShell("Move to Bin?", accent, content, actions), 0, 0, 0, 0);
        confirmDialog.show();
        styleCompactDialogWindow(confirmDialog);
    }

    private void showProfileDialog() {
        showProfileDialog(null);
    }

    private void showProfileDialog(ShoppingStore.Profile existing) {
        boolean editing = existing != null;
        EditText name = input("Profile name", editing ? existing.name : "");
        LinearLayout form = dialogForm();
        form.addView(name);

        final String[] selectedAccent = {editing ? existing.accent : colorToHex(activeAccentColor())};
        final List<TextView> swatches = new ArrayList<>();
        form.addView(sectionTitle("Profile colour"));
        HorizontalScrollView colorScroll = new HorizontalScrollView(this);
        colorScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout colorRow = new LinearLayout(this);
        colorRow.setOrientation(LinearLayout.HORIZONTAL);
        colorRow.setGravity(Gravity.CENTER_VERTICAL);
        for (String color : PROFILE_COLOR_PRESETS) {
            TextView swatch = colorSwatch(color, sameColor(color, selectedAccent[0]));
            swatch.setOnClickListener(v -> {
                selectedAccent[0] = color;
                updateSwatches(swatches, selectedAccent[0]);
            });
            swatches.add(swatch);
            colorRow.addView(swatch);
        }
        colorScroll.addView(colorRow);
        form.addView(colorScroll, new LinearLayout.LayoutParams(-1, dp(52)));
        form.addView(colorMaker("Custom colour", selectedAccent[0], color -> {
            selectedAccent[0] = color;
            updateSwatches(swatches, selectedAccent[0]);
        }));

        AlertDialog dialog = new AlertDialog.Builder(this).create();
        Button cancelButton = dialogButton("Cancel", false, activeAccentColor());
        cancelButton.setOnClickListener(v -> dialog.dismiss());
        Button addButton = dialogButton(editing ? "Save" : "Add", true, activeAccentColor());
        addButton.setOnClickListener(v -> {
            ShoppingStore.Profile profile = editing ? copyProfile(existing) : new ShoppingStore.Profile();
            profile.name = name.getText().toString().trim();
            profile.accent = selectedAccent[0];
            if (editing) {
                store.updateProfile(profile);
            } else {
                long id = store.insertProfile(profile);
                prefs.edit().putLong(ACTIVE_PROFILE_ID, id).apply();
            }
            loadProfiles();
            refreshItems();
            dialog.dismiss();
            toast(editing ? "Profile saved." : "Profile added.");
        });

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.VERTICAL);
        LinearLayout buttonRow = new LinearLayout(this);
        buttonRow.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams cancelParams = new LinearLayout.LayoutParams(0, dp(44), 1);
        cancelParams.setMargins(0, 0, dp(8), 0);
        buttonRow.addView(cancelButton, cancelParams);
        LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(0, dp(44), 1);
        addParams.setMargins(dp(8), 0, 0, 0);
        buttonRow.addView(addButton, addParams);
        actions.addView(buttonRow);

        dialog.setView(dialogShell(editing ? "Profile settings" : "Add profile", activeAccentColor(), form, actions), 0, 0, 0, 0);
        dialog.show();
        styleDialogWindow(dialog);
    }

    private void confirmDeleteProfile(ShoppingStore.Profile profile, AlertDialog editorDialog) {
        if (store.activeProfileCount() <= 1) {
            toast("Keep at least one profile.");
            return;
        }
        new AlertDialog.Builder(this)
            .setTitle("Delete profile?")
            .setMessage(profile.name + " and its list will be hidden from this app.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Delete", (confirm, which) -> {
                if (!store.deleteProfile(profile.id)) {
                    toast("Could not delete that profile.");
                    return;
                }
                if (activeProfileId == profile.id) {
                    prefs.edit().remove(ACTIVE_PROFILE_ID).apply();
                }
                loadProfiles();
                refreshItems();
                if (editorDialog != null) {
                    editorDialog.dismiss();
                }
                toast("Profile deleted.");
            })
            .show();
    }

    private void showBin() {
        List<ShoppingStore.Item> items = store.binItems();
        LinearLayout list = dialogForm();
        if (items.isEmpty()) {
            list.addView(text("The Bin is empty.", 16, SOFT_INK));
        }
        for (ShoppingStore.Item item : items) {
            LinearLayout row = row();
            String profileName = blank(item.profileName) ? "Unknown profile" : item.profileName;
            TextView copy = text(item.title + "\n" + profileName + "'s profile - Deleted " + shortDate(item.deletedAt), 15, INK);
            row.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));
            Button restore = smallButton("Restore");
            restore.setOnClickListener(v -> {
                store.restoreItem(item.id);
                refreshItems();
                toast("Item restored.");
            });
            row.addView(restore);
            Button clear = smallButton("Clear");
            clear.setOnClickListener(v -> {
                store.purgeItem(item.id);
                toast("Item details cleared.");
            });
            row.addView(clear);
            list.addView(row);
        }
        new AlertDialog.Builder(this)
            .setTitle("Bin")
            .setView(wrap(list))
            .setPositiveButton("Close", null)
            .show();
    }

    private void showHistory() {
        List<ShoppingStore.Change> changes = store.syncHistory();
        LinearLayout list = dialogForm();
        if (changes.isEmpty()) {
            list.addView(text("No sync history yet.", 16, SOFT_INK));
        }
        for (ShoppingStore.Change change : changes) {
            TextView row = text(change.summary + "\n" + change.operation + " - " + shortDate(change.createdAt), 15, INK);
            row.setPadding(0, dp(8), 0, dp(8));
            list.addView(row);
        }
        new AlertDialog.Builder(this)
            .setTitle("Sync History")
            .setView(wrap(list))
            .setPositiveButton("Close", null)
            .show();
    }

    private void showSettings() {
        ShoppingStore.StorageStats stats = store.storageStats();
        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(0, 0, 0, 0);
        list.setBackgroundColor(paperColor());

        final LinearLayout[] settingsShell = new LinearLayout[1];
        final Button[] closeButtonRef = new Button[1];
        list.addView(sectionTitle("Appearance"));
        list.addView(modeSelector());

        final String[] selectedAppColor = {colorToHex(appColor)};
        final List<TextView> appSwatches = new ArrayList<>();
        HorizontalScrollView appColorScroll = new HorizontalScrollView(this);
        appColorScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout appColorRow = new LinearLayout(this);
        appColorRow.setOrientation(LinearLayout.HORIZONTAL);
        appColorRow.setGravity(Gravity.CENTER_VERTICAL);
        for (String color : APP_COLOR_PRESETS) {
            TextView swatch = colorSwatch(color, sameColor(color, selectedAppColor[0]));
            swatch.setOnClickListener(v -> {
                selectedAppColor[0] = color;
                updateSwatches(appSwatches, selectedAppColor[0]);
                setAppColor(selectedAppColor[0]);
                if (settingsShell[0] != null) settingsShell[0].setBackground(rounded(appColor, 24));
                if (closeButtonRef[0] != null) styleDialogButton(closeButtonRef[0], true, appColor);
            });
            appSwatches.add(swatch);
            appColorRow.addView(swatch);
        }
        appColorScroll.addView(appColorRow);
        list.addView(appColorScroll, new LinearLayout.LayoutParams(-1, dp(52)));
        list.addView(colorMaker("Custom app colour", selectedAppColor[0], color -> {
            selectedAppColor[0] = color;
            updateSwatches(appSwatches, selectedAppColor[0]);
            setAppColor(selectedAppColor[0]);
            if (settingsShell[0] != null) settingsShell[0].setBackground(rounded(appColor, 24));
            if (closeButtonRef[0] != null) styleDialogButton(closeButtonRef[0], true, appColor);
        }));

        list.addView(sectionTitle("Storage"));
        list.addView(settingStat("Database", bytes(stats.databaseBytes)));
        list.addView(settingStat("Bin", stats.binCount + " item(s)"));
        list.addView(settingStat("Sync tombstones", String.valueOf(stats.tombstoneCount)));
        list.addView(settingStat("Sync changes", String.valueOf(stats.syncChangeCount)));

        list.addView(sectionTitle("Tools"));
        list.addView(settingsAction("Export list", "Share this profile's saved items.", v -> exportCurrentList()));
        list.addView(settingsAction("Bluetooth sync", "Primary direct sync with the PC app.", v -> startBluetoothSync()));
        list.addView(settingsAction("PC link sync", "Fallback sync through Wi-Fi or a phone hotspot.", v -> showPcLinkSyncDialog()));
        list.addView(settingsAction("Export sync bundle", "Share all profiles, items, Bin entries, and tombstones.", v -> exportSyncBundle()));
        list.addView(settingsAction("Import sync bundle", "Merge a bundle from the PC app or another phone.", v -> pickSyncBundle()));
        list.addView(settingsAction("FAQ", "Quick answers about local data and syncing.", v -> showFaq()));
        list.addView(settingsAction("Open Bin", "Restore or clear deleted items.", v -> showBin()));
        list.addView(settingsAction("Sync History", "View local sync and cleanup activity.", v -> showHistory()));
        list.addView(settingsAction("Clean old Bin items", "Remove Bin entries past the retention window.", v -> {
            int count = store.cleanupOldBin();
            toast(count == 0 ? "Nothing old enough to clean." : "Cleaned " + count + " item(s).");
        }));
        list.addView(settingsAction("Compact database", "Vacuum the local SQLite database.", v -> {
            store.compact();
            toast("Database compacted.");
        }));

        TextView note = text("Bluetooth sync keeps the Android and PC databases independent, then merges changes when you connect them.", 13, softTextColor());
        note.setPadding(0, dp(12), 0, 0);
        list.addView(note);

        AlertDialog dialog = new AlertDialog.Builder(this).create();
        Button closeButton = dialogButton("Close", true, appColor);
        closeButtonRef[0] = closeButton;
        closeButton.setOnClickListener(v -> dialog.dismiss());
        LinearLayout shell = dialogShell("Settings", appColor, list, closeButton);
        settingsShell[0] = shell;
        dialog.setView(shell, 0, 0, 0, 0);
        dialog.show();
        styleDialogWindow(dialog);
    }

    private void exportCurrentList() {
        ShoppingStore.Profile profile = currentProfile();
        List<ShoppingStore.Item> items = store.items(activeProfileId, activeListType, "all", "");
        StringBuilder output = new StringBuilder();
        output.append(profile == null ? "Listy" : profile.name + " " + listLabel(activeListType) + " List").append("\n\n");
        for (ShoppingStore.Item item : items) {
            output.append("- ").append(item.title).append("\n");
            output.append("  Status: ").append(labelForStatus(item.status, item.listType)).append("\n");
            output.append("  Price: ").append(item.priceAmount == null ? "Missing" : price(item.priceAmount, item.currency)).append("\n");
            if (!blank(item.tags)) output.append("  Tags: ").append(item.tags).append("\n");
            if (!blank(domainLabel(item))) output.append("  Site: ").append(domainLabel(item)).append("\n");
            if (!blank(item.url)) output.append("  Link: ").append(item.url).append("\n");
            if (!blank(item.orderStatus) || !blank(item.trackingNumber) || !blank(item.estimatedDelivery)) {
                output.append("  Order: ").append(blank(item.orderStatus) ? "Ordered" : item.orderStatus).append("\n");
                if (!blank(item.carrier)) output.append("  Carrier: ").append(item.carrier).append("\n");
                if (!blank(item.trackingNumber)) output.append("  Tracking: ").append(item.trackingNumber).append("\n");
                if (!blank(item.estimatedDelivery)) output.append("  Estimated delivery: ").append(item.estimatedDelivery).append("\n");
            }
            output.append("\n");
        }

        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType("text/plain");
        share.putExtra(Intent.EXTRA_SUBJECT, "Listy export");
        share.putExtra(Intent.EXTRA_TEXT, output.toString());
        try {
            startActivity(Intent.createChooser(share, "Export Listy"));
        } catch (Exception error) {
            toast("No export target found.");
        }
    }

    private void exportSyncBundle() {
        executor.execute(() -> {
            try {
                String bundle = store.exportSyncBundle();
                runOnUiThread(() -> saveSyncBundle(bundle));
            } catch (Exception error) {
                runOnUiThread(() -> toast("Could not create a sync bundle."));
            }
        });
    }

    private void saveSyncBundle(String bundle) {
        pendingSyncBundle = bundle;
        Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        save.addCategory(Intent.CATEGORY_OPENABLE);
        save.setType("application/json");
        String date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        save.putExtra(Intent.EXTRA_TITLE, "tracklist-sync-android-" + date + ".json");
        try {
            startActivityForResult(save, REQUEST_EXPORT_SYNC_BUNDLE);
        } catch (Exception error) {
            shareSyncBundle(bundle);
        }
    }

    private void shareSyncBundle(String bundle) {
        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType("application/json");
        share.putExtra(Intent.EXTRA_SUBJECT, "Listy sync bundle");
        share.putExtra(Intent.EXTRA_TEXT, bundle);
        try {
            startActivity(Intent.createChooser(share, "Export sync bundle"));
        } catch (Exception error) {
            toast("No export target found.");
        }
    }

    private void writeSyncBundle(Uri uri) {
        String bundle = pendingSyncBundle;
        pendingSyncBundle = "";
        executor.execute(() -> {
            try {
                writeUriText(uri, bundle);
                runOnUiThread(() -> toast("Sync bundle exported."));
            } catch (Exception error) {
                runOnUiThread(() -> toast("Could not save sync bundle."));
            }
        });
    }

    private void pickSyncBundle() {
        Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("*/*");
        try {
            startActivityForResult(Intent.createChooser(pick, "Import sync bundle"), REQUEST_IMPORT_SYNC_BUNDLE);
        } catch (Exception error) {
            toast("No file picker found.");
        }
    }

    private void importSyncBundle(Uri uri) {
        executor.execute(() -> {
            try {
                String json = readUriText(uri);
                ShoppingStore.SyncImportResult result = store.importSyncBundle(json);
                runOnUiThread(() -> {
                    loadProfiles();
                    refreshItems();
                    toast("Synced " + result.changedCount() + " change(s) from " + result.remoteDeviceName + ".");
                });
            } catch (Exception error) {
                runOnUiThread(() -> toast("Could not import that sync bundle."));
            }
        });
    }

    private void showPcLinkSyncDialog() {
        LinearLayout content = dialogForm();
        TextView detail = text("Open the PC app Settings and copy the Dev network URL. If you do not want to use home Wi-Fi, turn on your phone hotspot and connect the laptop to it first.", 13, softTextColor());
        detail.setPadding(0, 0, 0, dp(8));
        content.addView(detail);

        EditText urlInput = input("http://192.168.1.25:4173", prefs.getString(PC_SYNC_URL, ""));
        urlInput.setInputType(android.text.InputType.TYPE_TEXT_VARIATION_URI);
        content.addView(labeled("PC sync URL", urlInput));

        TextView status = text("", 13, softTextColor());
        status.setPadding(dp(9), dp(8), dp(9), dp(8));
        status.setBackground(roundedStroke(cardColor(), 10, lineColor(), 1));
        content.addView(status, new LinearLayout.LayoutParams(-1, -2));

        Button sync = dialogButton("Sync now", true, appColor);
        Button close = dialogButton("Close", false, appColor);
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.RIGHT);
        LinearLayout.LayoutParams syncParams = new LinearLayout.LayoutParams(0, dp(40), 1);
        syncParams.setMargins(0, 0, dp(8), 0);
        actions.addView(sync, syncParams);
        LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams(0, dp(40), 1);
        closeParams.setMargins(dp(8), 0, 0, 0);
        actions.addView(close, closeParams);

        AlertDialog dialog = new AlertDialog.Builder(this).create();
        close.setOnClickListener(v -> dialog.dismiss());
        sync.setOnClickListener(v -> syncWithPcLink(urlInput.getText().toString(), status, sync));
        dialog.setView(compactDialogShell("PC link sync", appColor, content, actions), 0, 0, 0, 0);
        dialog.show();
        styleCompactDialogWindow(dialog);
    }

    private void syncWithPcLink(String rawUrl, TextView status, Button button) {
        String baseUrl = normalizePcSyncUrl(rawUrl);
        if (baseUrl.isEmpty()) {
            status.setText("Enter the Dev network URL from the PC app Settings.");
            return;
        }
        prefs.edit().putString(PC_SYNC_URL, baseUrl).apply();
        button.setEnabled(false);
        status.setText("Connecting to PC...");
        executor.execute(() -> {
            try {
                String pcBundle = httpText(baseUrl + "/api/sync/bundle", "GET", null);
                ShoppingStore.SyncImportResult pcImport = store.importSyncBundle(pcBundle);
                String mergedBundle = store.exportSyncBundle();
                httpText(baseUrl + "/api/sync/import", "POST", mergedBundle);
                runOnUiThread(() -> {
                    button.setEnabled(true);
                    loadProfiles();
                    refreshItems();
                    status.setText("Sync finished. Imported " + pcImport.changedCount() + " PC change(s), then sent this phone's changes back.");
                    toast("PC link sync finished.");
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    button.setEnabled(true);
                    String message = pcLinkErrorMessage(error);
                    status.setText(message);
                    toast(message);
                });
            }
        });
    }

    private String normalizePcSyncUrl(String value) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty()) return "";
        while (text.endsWith("/")) {
            text = text.substring(0, text.length() - 1);
        }
        if (!text.startsWith("http://") && !text.startsWith("https://")) {
            text = "http://" + text;
        }
        return text;
    }

    private String httpText(String url, String method, String body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(45000);
        connection.setRequestMethod(method);
        connection.setRequestProperty("Accept", "application/json");
        if (body != null) {
            byte[] bytes = body.getBytes("UTF-8");
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Content-Length", String.valueOf(bytes.length));
            try (OutputStream output = connection.getOutputStream()) {
                output.write(bytes);
            }
        }
        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input != null) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                }
            }
            String text = output.toString("UTF-8");
            if (status >= 400) {
                throw new IllegalStateException(text.isEmpty() ? "PC returned HTTP " + status : text);
            }
            return text;
        } finally {
            connection.disconnect();
        }
    }

    private String pcLinkErrorMessage(Exception error) {
        String message = error.getMessage() == null ? "" : error.getMessage();
        String lower = message.toLowerCase(Locale.ROOT);
        if (lower.contains("failed to connect") || lower.contains("timed out") || lower.contains("host unreachable") || lower.contains("no route")) {
            return "Could not reach the PC. Check the URL, keep the PC app open, and make sure both devices are on the same Wi-Fi or phone hotspot.";
        }
        return message.isEmpty() ? "PC link sync failed." : "PC link sync failed: " + message;
    }

    private void startBluetoothSync() {
        if (!hasBluetoothSyncPermissions()) {
            requestBluetoothSyncPermissions();
            return;
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (bluetoothSyncDialog == null) {
            showBluetoothSyncDialog();
            requestBluetoothDiscoverable();
        }
        restartBluetoothSyncServer();
    }

    private void requestBluetoothDiscoverable() {
        try {
            Intent discoverable = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
            discoverable.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 120);
            startActivity(discoverable);
        } catch (Exception ignored) {
        }
    }

    private void restartBluetoothSyncServer() {
        int token = ++bluetoothSyncStartToken;
        stopBluetoothSyncServerOnly();
        setBluetoothSyncStatus("Opening Bluetooth sync...");
        bluetoothSyncHandler.postDelayed(() -> openBluetoothSyncServer(token), 700);
    }

    private void openBluetoothSyncServer(int token) {
        if (token != bluetoothSyncStartToken || bluetoothSyncDialog == null) {
            return;
        }
        bluetoothSyncServer = new BluetoothSyncServer(this, new BluetoothSyncServer.Listener() {
            @Override
            public void onStatus(String message) {
                setBluetoothSyncStatus(message);
            }

            @Override
            public String exportSyncBundle() throws Exception {
                return store.exportSyncBundle();
            }

            @Override
            public int importSyncBundle(String json) throws Exception {
                ShoppingStore.SyncImportResult result = store.importSyncBundle(json);
                runOnUiThread(() -> {
                    loadProfiles();
                    refreshItems();
                });
                return result.changedCount();
            }
        });

        try {
            bluetoothSyncServer.start();
        } catch (Exception error) {
            stopBluetoothSyncServerOnly();
            setBluetoothSyncStatus(bluetoothSyncOpenErrorMessage(error));
        }
    }

    private String bluetoothSyncOpenErrorMessage(Exception error) {
        String message = error.getMessage() == null ? "Bluetooth sync failed to open." : error.getMessage();
        String lower = message.toLowerCase(Locale.ROOT);
        if (lower.contains("cannot advertise the shoppinglist") ||
            lower.contains("cannot advertise the lifelist") ||
            lower.contains("cannot advertise the tracklist") ||
            lower.contains("does not support bluetooth le advertising") ||
            lower.contains("this phone cannot advertise")) {
            return message;
        }
        return message + " Tap Try again, or turn Bluetooth off and on.";
    }

    private boolean hasBluetoothSyncPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
            checkSelfPermission(Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED &&
            checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestBluetoothSyncPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;
        requestPermissions(
            new String[]{
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_SCAN
            },
            REQUEST_BLUETOOTH_SYNC_PERMISSIONS
        );
    }

    private void showBluetoothSyncDialog() {
        LinearLayout content = dialogForm();
        TextView detail = text("Keep this open, wait for Ready, then press Bluetooth Sync in the PC app. If Android asks to make the phone visible, allow it so the classic Bluetooth fallback can be found.", 13, softTextColor());
        detail.setPadding(0, 0, 0, dp(8));
        content.addView(detail);

        bluetoothSyncStatusText = text("Starting Bluetooth sync...", 13, textColor());
        bluetoothSyncStatusText.setTypeface(Typeface.DEFAULT_BOLD);
        bluetoothSyncStatusText.setPadding(dp(9), dp(8), dp(9), dp(8));
        bluetoothSyncStatusText.setBackground(roundedStroke(cardColor(), 10, activeAccentColor(), 1));
        content.addView(bluetoothSyncStatusText, new LinearLayout.LayoutParams(-1, -2));

        Button retry = dialogButton("Try again", false, appColor);
        Button close = dialogButton("Close", true, appColor);
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.RIGHT);
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(0, dp(40), 1);
        retryParams.setMargins(0, 0, dp(8), 0);
        actions.addView(retry, retryParams);
        LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams(0, dp(40), 1);
        closeParams.setMargins(dp(8), 0, 0, 0);
        actions.addView(close, closeParams);

        AlertDialog dialog = new AlertDialog.Builder(this).create();
        bluetoothSyncDialog = dialog;
        retry.setOnClickListener(v -> restartBluetoothSyncServer());
        close.setOnClickListener(v -> dialog.dismiss());
        dialog.setOnDismissListener(v -> {
            bluetoothSyncStartToken++;
            stopBluetoothSyncServerOnly();
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            bluetoothSyncDialog = null;
            bluetoothSyncStatusText = null;
        });
        dialog.setView(compactDialogShell("Bluetooth sync", appColor, content, actions), 0, 0, 0, 0);
        dialog.setCanceledOnTouchOutside(false);
        dialog.show();
        styleCompactDialogWindow(dialog);
    }

    private void setBluetoothSyncStatus(String message) {
        runOnUiThread(() -> {
            if (bluetoothSyncStatusText != null) {
                bluetoothSyncStatusText.setText(message);
            }
        });
    }

    private void stopBluetoothSync() {
        bluetoothSyncStartToken++;
        stopBluetoothSyncServerOnly();
        if (bluetoothSyncDialog != null) {
            bluetoothSyncDialog.dismiss();
            bluetoothSyncDialog = null;
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        bluetoothSyncStatusText = null;
    }

    private void stopBluetoothSyncServerOnly() {
        if (bluetoothSyncServer != null) {
            bluetoothSyncServer.shutdown();
            bluetoothSyncServer = null;
        }
    }

    private String readUriText(Uri uri) throws Exception {
        try (InputStream input = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalArgumentException("No file selected.");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toString("UTF-8");
        }
    }

    private void writeUriText(Uri uri, String text) throws Exception {
        try (OutputStream output = getContentResolver().openOutputStream(uri)) {
            if (output == null) throw new IllegalArgumentException("Could not open file.");
            output.write(text.getBytes("UTF-8"));
        }
    }

    private void showFaq() {
        new AlertDialog.Builder(this)
            .setTitle("FAQ")
            .setMessage("Can I use it offline?\nYes. The Android app keeps its own local database.\n\nCan it sync with PC?\nYes. Bluetooth sync is the primary option. Open Bluetooth sync on Android, wait for Ready, then press Bluetooth Sync in PC Settings. If Bluetooth will not connect, use PC link sync with the fallback PC link URL.\n\nWhat if a link fetch is wrong?\nOpen the item and edit the title, price, image, tags, notes, and order details manually.")
            .setPositiveButton("Close", null)
            .show();
    }

    private TextView sectionTitle(String label) {
        TextView title = text(label.toUpperCase(Locale.ROOT), 12, mutedTextColor());
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setPadding(0, dp(14), 0, dp(6));
        return title;
    }

    private View settingStat(String label, String value) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(12), 0, dp(12), 0);
        row.setBackground(roundedStroke(cardColor(), 8, lineColor(), 1));

        TextView name = text(label, 14, textColor());
        name.setTypeface(Typeface.DEFAULT_BOLD);
        row.addView(name, new LinearLayout.LayoutParams(0, -2, 1));

        TextView detail = text(value, 14, softTextColor());
        detail.setGravity(Gravity.RIGHT);
        row.addView(detail, new LinearLayout.LayoutParams(-2, -2));

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(48));
        params.setMargins(0, 0, 0, dp(7));
        row.setLayoutParams(params);
        return row;
    }

    private View settingsAction(String title, String detail, View.OnClickListener listener) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(12), dp(8), dp(10), dp(8));
        row.setBackground(roundedStroke(cardColor(), 8, lineColor(), 1));
        row.setOnClickListener(listener);

        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        TextView label = text(title, 15, textColor());
        label.setTypeface(Typeface.DEFAULT_BOLD);
        TextView sub = text(detail, 12, softTextColor());
        sub.setPadding(0, dp(2), 0, 0);
        copy.addView(label);
        copy.addView(sub);
        row.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));

        TextView arrow = text(">", 22, activeAccentColor());
        arrow.setGravity(Gravity.CENTER);
        row.addView(arrow, new LinearLayout.LayoutParams(dp(28), -1));

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(62));
        params.setMargins(0, 0, 0, dp(8));
        row.setLayoutParams(params);
        return row;
    }

    private LinearLayout dialogShell(String title, int accent, View content, View actions) {
        LinearLayout outer = new LinearLayout(this);
        outer.setOrientation(LinearLayout.VERTICAL);
        outer.setPadding(dp(3), dp(3), dp(3), dp(3));
        outer.setBackground(rounded(accent, 24));

        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(dp(14), dp(12), dp(14), dp(14));
        inner.setBackground(rounded(paperColor(), 21));

        TextView heading = text(title, 22, textColor());
        heading.setTypeface(Typeface.DEFAULT_BOLD);
        heading.setPadding(0, 0, 0, dp(10));
        inner.addView(heading, new LinearLayout.LayoutParams(-1, -2));

        ScrollView scroll = wrap(content);
        int maxHeight = Math.max(dp(280), getResources().getDisplayMetrics().heightPixels - dp(250));
        inner.addView(scroll, new LinearLayout.LayoutParams(-1, maxHeight));

        LinearLayout.LayoutParams actionParams = new LinearLayout.LayoutParams(-1, -2);
        actionParams.setMargins(0, dp(12), 0, 0);
        inner.addView(actions, actionParams);

        outer.addView(inner, new LinearLayout.LayoutParams(-1, -2));
        return outer;
    }

    private LinearLayout compactDialogShell(String title, int accent, View content, View actions) {
        LinearLayout outer = new LinearLayout(this);
        outer.setOrientation(LinearLayout.VERTICAL);
        outer.setPadding(dp(2), dp(2), dp(2), dp(2));
        outer.setBackground(rounded(accent, 16));

        LinearLayout inner = new LinearLayout(this);
        inner.setOrientation(LinearLayout.VERTICAL);
        inner.setPadding(dp(10), dp(9), dp(10), dp(10));
        inner.setBackground(rounded(paperColor(), 14));

        TextView heading = text(title, 16, textColor());
        heading.setTypeface(Typeface.DEFAULT_BOLD);
        heading.setPadding(0, 0, 0, dp(8));
        inner.addView(heading, new LinearLayout.LayoutParams(-1, -2));
        inner.addView(content, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout.LayoutParams actionParams = new LinearLayout.LayoutParams(-1, -2);
        actionParams.setMargins(0, dp(10), 0, 0);
        inner.addView(actions, actionParams);

        outer.addView(inner, new LinearLayout.LayoutParams(-1, -2));
        return outer;
    }

    private void styleDialogWindow(AlertDialog dialog) {
        Window window = dialog.getWindow();
        if (window == null) return;
        window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        int width = getResources().getDisplayMetrics().widthPixels - dp(28);
        window.setLayout(width, -2);
    }

    private void styleCompactDialogWindow(AlertDialog dialog) {
        Window window = dialog.getWindow();
        if (window == null) return;
        window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        int available = getResources().getDisplayMetrics().widthPixels - dp(56);
        window.setLayout(Math.min(available, dp(320)), -2);
    }

    private Button dialogButton(String label, boolean primary, int accent) {
        Button button = smallButton(label);
        button.setTextSize(14);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        styleDialogButton(button, primary, accent);
        button.setMinHeight(dp(38));
        return button;
    }

    private void styleDialogButton(Button button, boolean primary, int accent) {
        button.setTextColor(primary ? readableOn(accent) : accent);
        button.setBackground(primary
            ? rounded(accent, 999)
            : roundedStroke(Color.TRANSPARENT, 999, accent, 1));
    }

    private ImageView filterIconButton(int color) {
        ImageView button = new ImageView(this);
        button.setImageBitmap(filterIconBitmap(color));
        button.setPadding(dp(8), dp(8), dp(8), dp(8));
        button.setBackground(roundedStroke(fieldColor(), 10, lineColor(), 1));
        return button;
    }

    private Bitmap filterIconBitmap(int color) {
        int size = dp(28);
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(color);
        paint.setStrokeWidth(dp(2));
        paint.setStrokeCap(Paint.Cap.ROUND);
        int left = dp(5);
        int right = size - dp(5);
        int[] ys = {dp(8), dp(14), dp(20)};
        int[] knobs = {dp(11), dp(18), dp(14)};
        for (int i = 0; i < ys.length; i++) {
            canvas.drawLine(left, ys[i], right, ys[i], paint);
            canvas.drawCircle(knobs[i], ys[i], dp(3), paint);
        }
        return bitmap;
    }

    private View modeSelector() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        Button light = dialogButton("Light", !darkMode, appColor);
        Button dark = dialogButton("Dark", darkMode, appColor);
        light.setOnClickListener(v -> {
            setDarkMode(false);
            styleDialogButton(light, true, appColor);
            styleDialogButton(dark, false, appColor);
        });
        dark.setOnClickListener(v -> {
            setDarkMode(true);
            styleDialogButton(light, false, appColor);
            styleDialogButton(dark, true, appColor);
        });
        LinearLayout.LayoutParams left = new LinearLayout.LayoutParams(0, dp(44), 1);
        left.setMargins(0, 0, dp(8), 0);
        row.addView(light, left);
        LinearLayout.LayoutParams right = new LinearLayout.LayoutParams(0, dp(44), 1);
        right.setMargins(dp(8), 0, 0, 0);
        row.addView(dark, right);
        return row;
    }

    private View colorMaker(String label, String initialColor, ColorChangeListener listener) {
        LinearLayout maker = new LinearLayout(this);
        maker.setOrientation(LinearLayout.VERTICAL);
        maker.setPadding(dp(10), dp(10), dp(10), dp(8));
        maker.setBackground(roundedStroke(cardColor(), 12, lineColor(), 1));

        TextView title = text(label, 13, softTextColor());
        title.setTypeface(Typeface.DEFAULT_BOLD);
        maker.addView(title);

        int parsed = parseColor(initialColor, ACCENT);
        final int[] rgb = {Color.red(parsed), Color.green(parsed), Color.blue(parsed)};
        TextView preview = text(colorToHex(parsed), 13, textColor());
        preview.setGravity(Gravity.CENTER);
        preview.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams previewParams = new LinearLayout.LayoutParams(-1, dp(36));
        previewParams.setMargins(0, dp(8), 0, dp(8));
        maker.addView(preview, previewParams);

        maker.addView(colorSlider("R", rgb, 0, preview, listener));
        maker.addView(colorSlider("G", rgb, 1, preview, listener));
        maker.addView(colorSlider("B", rgb, 2, preview, listener));
        return maker;
    }

    private View colorSlider(String label, int[] rgb, int index, TextView preview, ColorChangeListener listener) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        TextView name = text(label, 12, mutedTextColor());
        name.setTypeface(Typeface.DEFAULT_BOLD);
        row.addView(name, new LinearLayout.LayoutParams(dp(22), -2));

        SeekBar slider = new SeekBar(this);
        slider.setMax(255);
        slider.setProgress(rgb[index]);
        slider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                rgb[index] = progress;
                int color = Color.rgb(rgb[0], rgb[1], rgb[2]);
                preview.setText(colorToHex(color));
                preview.setBackground(rounded(color, 10));
                preview.setTextColor(readableOn(color));
                listener.onChanged(colorToHex(color));
            }
            @Override public void onStartTrackingTouch(SeekBar seekBar) {}
            @Override public void onStopTrackingTouch(SeekBar seekBar) {}
        });
        row.addView(slider, new LinearLayout.LayoutParams(0, dp(38), 1));

        int color = Color.rgb(rgb[0], rgb[1], rgb[2]);
        preview.setBackground(rounded(color, 10));
        preview.setTextColor(readableOn(color));
        listener.onChanged(colorToHex(color));
        return row;
    }

    private void loadImage(ImageView image, String url) {
        image.setImageDrawable(null);
        if (url == null || url.trim().isEmpty()) return;
        executor.execute(() -> {
            try (InputStream stream = new URL(url).openStream()) {
                Bitmap bitmap = BitmapFactory.decodeStream(stream);
                runOnUiThread(() -> image.setImageBitmap(bitmap));
            } catch (Exception ignored) {
                runOnUiThread(() -> image.setImageDrawable(null));
            }
        });
    }

    private LinearLayout dialogForm() {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(2), dp(4), dp(2), dp(4));
        return form;
    }

    private ScrollView wrap(View view) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(false);
        scroll.addView(view);
        return scroll;
    }

    private Spinner spinner(String[] labels) {
        Spinner spinner = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, labels);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        spinner.setPadding(dp(8), 0, dp(8), 0);
        spinner.setBackground(roundedStroke(fieldColor(), 10, lineColor(), 1));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(46));
        params.setMargins(0, 0, 0, dp(8));
        spinner.setLayoutParams(params);
        return spinner;
    }

    private EditText input(String hint, String value) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setSingleLine(true);
        input.setText(value == null ? "" : value);
        input.setTextSize(15);
        input.setTextColor(textColor());
        input.setHintTextColor(mutedTextColor());
        input.setPadding(dp(12), 0, dp(12), 0);
        input.setMinHeight(dp(46));
        input.setBackground(roundedStroke(fieldColor(), 10, lineColor(), 1));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(48));
        params.setMargins(0, 0, 0, dp(8));
        input.setLayoutParams(params);
        return input;
    }

    private EditText multiInput(String hint, String value) {
        EditText input = input(hint, value);
        input.setSingleLine(false);
        input.setMinLines(3);
        input.setGravity(Gravity.TOP | Gravity.START);
        input.setPadding(dp(12), dp(10), dp(12), dp(10));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(96));
        params.setMargins(0, 0, 0, dp(8));
        input.setLayoutParams(params);
        return input;
    }

    private View labeled(String label, View field) {
        LinearLayout wrap = new LinearLayout(this);
        wrap.setOrientation(LinearLayout.VERTICAL);
        TextView text = text(label, 13, softTextColor());
        text.setPadding(0, 0, 0, dp(4));
        wrap.addView(text);
        wrap.addView(field);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, 0, 0, dp(4));
        wrap.setLayoutParams(params);
        return wrap;
    }

    private LinearLayout row() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(0, dp(6), 0, dp(6));
        return row;
    }

    private Button smallButton(String label) {
        return smallButton(label, null);
    }

    private Button smallButton(String label, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(12);
        button.setAllCaps(false);
        if (listener != null) button.setOnClickListener(listener);
        return button;
    }

    private Button accentButton(String label, int fill) {
        Button button = smallButton(label);
        button.setTextColor(readableOn(fill));
        button.setTextSize(14);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setBackground(rounded(fill, 999));
        button.setElevation(dp(2));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(44));
        params.setMargins(0, 0, 0, dp(8));
        button.setLayoutParams(params);
        return button;
    }

    private Button floatingButton(String label, int size, int fill, int color) {
        Button button = smallButton(label);
        button.setTextColor(color);
        button.setTextSize(size);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setBackground(rounded(fill, 999));
        button.setElevation(dp(8));
        return button;
    }

    private TextView floatingTextButton(String label, int size, int fill, int color) {
        TextView button = text(label, size, color);
        button.setGravity(Gravity.CENTER);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setBackground(rounded(fill, 999));
        button.setElevation(dp(8));
        return button;
    }

    private Button dangerButton(String label, View.OnClickListener listener) {
        Button button = smallButton(label, listener);
        button.setTextColor(RED);
        button.setBackground(roundedStroke(Color.TRANSPARENT, 999, RED, 1));
        return button;
    }

    private TextView railIcon(String label, int size, int fill, int color) {
        TextView button = text(label, size, color);
        button.setGravity(Gravity.CENTER);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setBackground(roundedStroke(fill, 10, Color.argb(120, 255, 255, 255), 1));
        return button;
    }

    private TextView colorSwatch(String color, boolean selected) {
        int parsed = parseColor(color, ACCENT);
        TextView swatch = text("", 1, Color.TRANSPARENT);
        swatch.setTag(colorToHex(parsed));
        swatch.setBackground(roundedStroke(parsed, 12, selected ? textColor() : lineColor(), selected ? 2 : 1));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(42), dp(42));
        params.setMargins(0, 0, dp(8), 0);
        swatch.setLayoutParams(params);
        return swatch;
    }

    private void updateSwatches(List<TextView> swatches, String selectedColor) {
        for (TextView swatch : swatches) {
            String color = String.valueOf(swatch.getTag());
            boolean selected = sameColor(color, selectedColor);
            swatch.setBackground(roundedStroke(parseColor(color, ACCENT), 12, selected ? textColor() : lineColor(), selected ? 2 : 1));
        }
    }

    private TextView chip(String label, boolean selected, boolean compact) {
        TextView chip = text(label, compact ? 12 : 13, selected ? Color.rgb(145, 103, 145) : INK);
        chip.setTextColor(selected ? activeAccentColor() : textColor());
        chip.setGravity(Gravity.CENTER);
        chip.setSingleLine(true);
        chip.setTypeface(selected ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        chip.setPadding(dp(compact ? 10 : 12), 0, dp(compact ? 10 : 12), 0);
        chip.setBackground(roundedStroke(selected ? chipSelectedColor() : Color.TRANSPARENT, 999, selected ? activeAccentColor() : Color.TRANSPARENT, 1));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-2, compact ? dp(34) : dp(38));
        params.setMargins(dp(3), 0, dp(5), 0);
        chip.setLayoutParams(params);
        return chip;
    }

    private TextView text(String value, int size, int color) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(size);
        text.setTextColor(color);
        return text;
    }

    private GradientDrawable rounded(int color, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radiusDp));
        return drawable;
    }

    private GradientDrawable roundedStroke(int color, int radiusDp, int strokeColor, int strokeWidthDp) {
        GradientDrawable drawable = rounded(color, radiusDp);
        if (strokeWidthDp > 0 && strokeColor != Color.TRANSPARENT) {
            drawable.setStroke(dp(strokeWidthDp), strokeColor);
        }
        return drawable;
    }

    private ShoppingStore.Profile copyProfile(ShoppingStore.Profile source) {
        ShoppingStore.Profile profile = new ShoppingStore.Profile();
        profile.id = source.id;
        profile.uuid = source.uuid;
        profile.name = source.name;
        profile.accent = source.accent;
        profile.avatarUrl = source.avatarUrl;
        profile.sortOrder = source.sortOrder;
        profile.version = source.version;
        profile.createdAt = source.createdAt;
        profile.updatedAt = source.updatedAt;
        return profile;
    }

    private ShoppingStore.Item copy(ShoppingStore.Item source) {
        ShoppingStore.Item item = new ShoppingStore.Item();
        item.id = source.id;
        item.uuid = source.uuid;
        item.profileId = source.profileId;
        item.listType = source.listType;
        item.url = source.url;
        item.sourceDomain = source.sourceDomain;
        item.title = source.title;
        item.description = source.description;
        item.imageUrl = source.imageUrl;
        item.priceAmount = source.priceAmount;
        item.currency = source.currency;
        item.status = source.status;
        item.tags = source.tags;
        item.notes = source.notes;
        item.priority = source.priority;
        item.orderStatus = source.orderStatus;
        item.carrier = source.carrier;
        item.trackingNumber = source.trackingNumber;
        item.trackingUrl = source.trackingUrl;
        item.orderedAt = source.orderedAt;
        item.estimatedDelivery = source.estimatedDelivery;
        item.orderNotes = source.orderNotes;
        item.version = source.version;
        item.createdAt = source.createdAt;
        item.updatedAt = source.updatedAt;
        return item;
    }

    private String price(double value, String currency) {
        try {
            return (currency == null || currency.isEmpty() ? "EUR" : currency.toUpperCase(Locale.ROOT)) + " " + String.format(Locale.US, "%.2f", value);
        } catch (Exception error) {
            return String.format(Locale.US, "%.2f", value);
        }
    }

    private Double parsePrice(String value) {
        String text = value == null ? "" : value.trim().replace(",", ".");
        if (text.isEmpty()) return null;
        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private String listTypeValue(int index) {
        int safeIndex = Math.max(0, Math.min(index, LIST_TYPES.length - 1));
        return LIST_TYPES[safeIndex];
    }

    private void setSpinnerLabels(Spinner spinner, String[] labels) {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, labels);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
    }

    private String statusValue(String type, int index) {
        String[] values = statusValues(type);
        int safeIndex = Math.max(1, Math.min(index + 1, values.length - 1));
        return values[safeIndex];
    }

    private int statusIndex(String status, String type) {
        String[] values = statusValues(type);
        for (int i = 1; i < values.length; i++) {
            if (values[i].equals(status)) return i - 1;
        }
        return 0;
    }

    private String labelForStatus(String status, String type) {
        String[] values = statusValues(type);
        String[] labels = statusLabels(type);
        for (int i = 1; i < values.length; i++) {
            if (values[i].equals(status)) return labels[i];
        }
        return labels.length > 1 ? labels[1] : "Wanted";
    }

    private boolean contains(String[] values, String value) {
        if (value == null) return false;
        for (String known : values) {
            if (known.equals(value)) return true;
        }
        return false;
    }

    private List<String> splitTags(String value) {
        List<String> tags = new ArrayList<>();
        if (value == null || value.trim().isEmpty()) return tags;
        String cleaned = value.replace("#", " ").trim();
        String[] parts = cleaned.contains(",") || cleaned.contains(";") ? cleaned.split("[,;]") : cleaned.split("\\s+");
        for (String part : parts) {
            String tag = part.trim();
            if (!tag.isEmpty()) tags.add(tag);
        }
        return tags;
    }

    private String normalizeTag(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private String domain(String value) {
        try {
            String host = new URL(value).getHost();
            return host == null ? "" : host.replaceFirst("^www\\.", "");
        } catch (Exception error) {
            return "";
        }
    }

    private String initial(String value) {
        String text = value == null ? "" : value.trim();
        return text.isEmpty() ? "?" : text.substring(0, 1).toUpperCase(Locale.ROOT);
    }

    private void loadAppearance() {
        appColor = parseColor(prefs.getString(APP_COLOR, "#3f4e57"), RAIL);
        darkMode = prefs.getBoolean(DARK_MODE, false);
        getWindow().setStatusBarColor(appColor);
        getWindow().setNavigationBarColor(appColor);
    }

    private void setAppColor(String color) {
        appColor = parseColor(color, RAIL);
        prefs.edit().putString(APP_COLOR, colorToHex(appColor)).apply();
        applyAppearanceToShell();
    }

    private void setDarkMode(boolean enabled) {
        if (darkMode == enabled) return;
        darkMode = enabled;
        prefs.edit().putBoolean(DARK_MODE, darkMode).apply();
        applyAppearanceToShell();
    }

    private void applyAppearanceToShell() {
        getWindow().setStatusBarColor(appColor);
        getWindow().setNavigationBarColor(appColor);
        if (shellRoot != null) shellRoot.setBackgroundColor(appColor);
        if (rootLayout != null) rootLayout.setBackgroundColor(appColor);
        if (titlebarView != null) titlebarView.setBackgroundColor(appColor);
        if (bodyLayout != null) bodyLayout.setBackgroundColor(appColor);
        if (profileRail != null) profileRail.setBackgroundColor(appColor);
        if (panelView != null) panelView.setBackground(rounded(paperColor(), 20));
        if (tagScrollView != null) tagScrollView.setBackgroundColor(tagWashColor());
        if (advancedSearchPanel != null) advancedSearchPanel.setBackground(roundedStroke(cardColor(), 12, lineColor(), 1));
        if (searchInput != null) {
            searchInput.setTextColor(textColor());
            searchInput.setHintTextColor(mutedTextColor());
            searchInput.setBackground(roundedStroke(fieldColor(), 10, lineColor(), 1));
        }
        if (advancedToggleButton != null) {
            advancedToggleButton.setImageBitmap(filterIconBitmap(softTextColor()));
            advancedToggleButton.setBackground(roundedStroke(fieldColor(), 10, lineColor(), 1));
        }
        if (railToggleButton != null) railToggleButton.setBackground(rounded(appColorDark(), 999));
        if (railSettingsButton != null) railSettingsButton.setBackground(roundedStroke(appColorDark(), 10, Color.argb(120, 255, 255, 255), 1));
        renderBrandTitle();
        renderProfiles();
        refreshItems();
    }

    private int appColorDark() {
        return blend(appColor, Color.BLACK, 0.22f);
    }

    private int paperColor() {
        return darkMode ? Color.rgb(28, 31, 33) : PAPER;
    }

    private int cardColor() {
        return darkMode ? Color.rgb(36, 40, 42) : Color.rgb(250, 249, 246);
    }

    private int fieldColor() {
        return darkMode ? Color.rgb(43, 48, 50) : Color.WHITE;
    }

    private int tagWashColor() {
        return darkMode ? Color.rgb(34, 38, 40) : TAG_WASH;
    }

    private int textColor() {
        return darkMode ? Color.rgb(236, 240, 238) : INK;
    }

    private int softTextColor() {
        return darkMode ? Color.rgb(190, 199, 196) : SOFT_INK;
    }

    private int mutedTextColor() {
        return darkMode ? Color.rgb(148, 160, 156) : MUTED;
    }

    private int lineColor() {
        return darkMode ? Color.rgb(70, 76, 78) : LINE;
    }

    private int chipSelectedColor() {
        return darkMode ? blend(activeAccentColor(), Color.BLACK, 0.68f) : Color.rgb(250, 244, 248);
    }

    private int readableOn(int color) {
        int brightness = (Color.red(color) * 299 + Color.green(color) * 587 + Color.blue(color) * 114) / 1000;
        return brightness > 145 ? Color.rgb(28, 32, 33) : Color.WHITE;
    }

    private int blend(int color, int target, float amount) {
        int red = Math.round(Color.red(color) + (Color.red(target) - Color.red(color)) * amount);
        int green = Math.round(Color.green(color) + (Color.green(target) - Color.green(color)) * amount);
        int blue = Math.round(Color.blue(color) + (Color.blue(target) - Color.blue(color)) * amount);
        return Color.rgb(red, green, blue);
    }

    private String colorToHex(int color) {
        return String.format(Locale.US, "#%02x%02x%02x", Color.red(color), Color.green(color), Color.blue(color));
    }

    private boolean sameColor(String left, String right) {
        return colorToHex(parseColor(left, ACCENT)).equalsIgnoreCase(colorToHex(parseColor(right, ACCENT)));
    }

    private int indexOf(String[] values, String value) {
        for (int i = 0; i < values.length; i++) {
            if (values[i].equals(value)) return i;
        }
        return 0;
    }

    private boolean blank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String safeText(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
    }

    private int parseColor(String value, int fallback) {
        try {
            return Color.parseColor(value);
        } catch (Exception error) {
            return fallback;
        }
    }

    private String shortDate(String iso) {
        if (iso == null || iso.isEmpty()) return "unknown";
        try {
            Date date = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(iso);
            return new SimpleDateFormat("dd MMM HH:mm", Locale.UK).format(date);
        } catch (Exception error) {
            return iso;
        }
    }

    private String bytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format(Locale.US, "%.1f KB", bytes / 1024.0);
        return String.format(Locale.US, "%.1f MB", bytes / (1024.0 * 1024.0));
    }

    private void toast(String message) {
        if (isStickyMessage(message)) {
            showStickyToast(message);
            return;
        }
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private boolean isStickyMessage(String message) {
        String lower = message == null ? "" : message.toLowerCase(Locale.ROOT);
        return lower.startsWith("could not") ||
            lower.startsWith("no ") ||
            lower.startsWith("turn bluetooth") ||
            lower.contains("needs nearby devices") ||
            lower.contains("failed") ||
            lower.contains("error");
    }

    private void showStickyToast(String message) {
        if (shellRoot == null) {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show();
            return;
        }
        dismissStickyToast();

        LinearLayout banner = new LinearLayout(this);
        banner.setOrientation(LinearLayout.HORIZONTAL);
        banner.setGravity(Gravity.CENTER_VERTICAL);
        banner.setPadding(dp(12), dp(10), dp(8), dp(10));
        banner.setBackground(rounded(Color.rgb(127, 51, 46), 12));

        TextView copy = text(message, 13, Color.WHITE);
        copy.setMaxLines(5);
        banner.addView(copy, new LinearLayout.LayoutParams(0, -2, 1));

        TextView close = text("x", 18, Color.WHITE);
        close.setGravity(Gravity.CENTER);
        close.setTypeface(Typeface.DEFAULT_BOLD);
        close.setBackground(rounded(Color.argb(34, 255, 255, 255), 999));
        close.setOnClickListener(v -> dismissStickyToast());
        LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams(dp(34), dp(34));
        closeParams.setMargins(dp(8), 0, 0, 0);
        banner.addView(close, closeParams);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        params.setMargins(dp(14), 0, dp(14), dp(88));
        shellRoot.addView(banner, params);
        stickyToastView = banner;
    }

    private void dismissStickyToast() {
        if (shellRoot != null && stickyToastView != null) {
            shellRoot.removeView(stickyToastView);
        }
        stickyToastView = null;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
