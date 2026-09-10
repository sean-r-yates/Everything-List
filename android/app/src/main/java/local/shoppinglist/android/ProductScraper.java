package local.shoppinglist.android;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ProductScraper {
    private ProductScraper() {}

    static ShoppingStore.Item scrape(long profileId, String rawUrl) throws Exception {
        URL url = new URL(rawUrl.trim());
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(12000);
        connection.setReadTimeout(12000);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("User-Agent", "Mozilla/5.0 Listy Android");
        connection.setRequestProperty("Accept", "text/html,application/xhtml+xml");

        StringBuilder html = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null && html.length() < 600_000) {
                html.append(line).append('\n');
            }
        } finally {
            connection.disconnect();
        }

        String body = html.toString();
        ShoppingStore.Item item = new ShoppingStore.Item();
        item.profileId = profileId;
        item.url = url.toString();
        item.sourceDomain = domain(url);
        item.title = first(
            meta(body, "og:title"),
            meta(body, "twitter:title"),
            title(body),
            "Untitled item"
        );
        item.description = first(meta(body, "og:description"), meta(body, "description"), "");
        item.imageUrl = absolutize(first(meta(body, "og:image"), meta(body, "twitter:image"), ""), url);
        item.currency = first(meta(body, "product:price:currency"), jsonLd(body, "priceCurrency"), currencyFromPage(body), "EUR").toUpperCase(Locale.ROOT);
        item.priceAmount = parsePrice(first(
            meta(body, "product:price:amount"),
            meta(body, "og:price:amount"),
            jsonLd(body, "price"),
            ""
        ));
        item.tags = guessTags(item.title + " " + item.description);
        item.status = "wanted";
        return item;
    }

    private static String meta(String html, String name) {
        String pattern = "<meta\\s+[^>]*(?:property|name)=[\"']" + Pattern.quote(name) + "[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>";
        Matcher matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(html);
        if (matcher.find()) return decode(matcher.group(1));

        pattern = "<meta\\s+[^>]*content=[\"']([^\"']+)[\"'][^>]*(?:property|name)=[\"']" + Pattern.quote(name) + "[\"'][^>]*>";
        matcher = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(html);
        return matcher.find() ? decode(matcher.group(1)) : "";
    }

    private static String jsonLd(String html, String key) {
        Matcher matcher = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"?([^\",}\\]]+)\"?", Pattern.CASE_INSENSITIVE).matcher(html);
        return matcher.find() ? decode(matcher.group(1)) : "";
    }

    private static String title(String html) {
        Matcher matcher = Pattern.compile("<title[^>]*>(.*?)</title>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(html);
        return matcher.find() ? decode(strip(matcher.group(1))) : "";
    }

    private static Double parsePrice(String value) {
        String cleaned = value == null ? "" : value.replaceAll("[^0-9.,]", "").trim();
        if (cleaned.isEmpty()) return null;
        if (cleaned.contains(",") && cleaned.contains(".")) {
            cleaned = cleaned.replace(",", "");
        } else {
            cleaned = cleaned.replace(",", ".");
        }
        try {
            return Double.parseDouble(cleaned);
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private static String currencyFromPage(String html) {
        if (html.contains("\u20ac")) return "EUR";
        if (html.contains("\u00a3")) return "GBP";
        if (html.contains("$")) return "USD";
        return "";
    }

    private static String guessTags(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        StringBuilder tags = new StringBuilder();
        addTag(tags, lower, "tech", "laptop", "pc", "keyboard", "mouse", "monitor", "headphone", "phone", "tablet");
        addTag(tags, lower, "furniture", "chair", "desk", "sofa", "table", "stool", "bed", "shelf");
        addTag(tags, lower, "clothes", "shirt", "jacket", "jeans", "hoodie", "shoes", "trainer");
        addTag(tags, lower, "kitchen", "pan", "knife", "plate", "mug", "blender", "coffee");
        return tags.toString();
    }

    private static void addTag(StringBuilder tags, String text, String tag, String... words) {
        for (String word : words) {
            if (text.contains(word)) {
                if (tags.length() > 0) tags.append(", ");
                tags.append(tag);
                return;
            }
        }
    }

    private static String absolutize(String value, URL base) {
        if (value == null || value.trim().isEmpty()) return "";
        try {
            return base.toURI().resolve(new URI(value.trim())).toString();
        } catch (Exception error) {
            return value.trim();
        }
    }

    private static String domain(URL url) {
        String host = url.getHost() == null ? "" : url.getHost();
        return host.startsWith("www.") ? host.substring(4) : host;
    }

    private static String first(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) return value.trim();
        }
        return "";
    }

    private static String strip(String value) {
        return value == null ? "" : value.replaceAll("<[^>]+>", " ");
    }

    private static String decode(String value) {
        return strip(value)
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
