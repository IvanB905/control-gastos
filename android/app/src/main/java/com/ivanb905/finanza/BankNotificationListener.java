package com.ivanb905.finanza;

import android.app.Notification;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Captures only recognizable transaction notifications from explicitly allowed bank apps.
 * Notification text is parsed in memory and is never persisted or logged.
 */
public class BankNotificationListener extends NotificationListenerService {
    private static final String PREFS = "captured_bank_transactions";
    private static final String QUEUE_KEY = "queue";
    private static final int MAX_PENDING = 50;
    private static final Set<String> BANK_PACKAGES = Collections.unmodifiableSet(new java.util.HashSet<>(Arrays.asList(
        "co.com.bancolombia.personas.superapp",
        "com.nequi.MobileApp",
        "com.bbva.mb",
        "com.bancodebogota.bancamovil",
        "com.bcs.retail",
        "com.davivienda.daviviendaapp",
        "com.davivienda.daviplataapp",
        "eu.netinfo.colpatria.system",
        "com.grupoavaloc1.bancamovil",
        "co.com.bancoagrario.icbanking.v7",
        "co.gov.bancoagrario.bico",
        "co.com.lulobank.production",
        "com.nu.production"
    )));
    private static final Pattern CURRENCY_AMOUNT = Pattern.compile("(?i)(COP|USD|US\\$|\\$)\\s*\\$?\\s*([0-9][0-9.,]*)");
    private static final Pattern SUFFIX_AMOUNT = Pattern.compile("(?i)([0-9][0-9.,]*)\\s*(COP|USD)");
    private static final Pattern NUMBER_PART = Pattern.compile("[0-9][0-9.,]*");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || !isSupportedBank(sbn.getPackageName())) return;
        JSONObject parsed = parseNotification(sbn);
        if (parsed != null) saveIfNew(parsed);
    }

    private boolean isSupportedBank(String packageName) {
        return packageName != null && BANK_PACKAGES.contains(packageName);
    }

    private JSONObject parseNotification(StatusBarNotification sbn) {
        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        String title = text(extras.getCharSequence(Notification.EXTRA_TITLE));
        String body = text(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (body.isEmpty()) body = text(extras.getCharSequence(Notification.EXTRA_TEXT));
        CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
        if (lines != null) {
            StringBuilder combined = new StringBuilder(body);
            for (CharSequence line : lines) {
                String value = text(line);
                if (!value.isEmpty()) combined.append(' ').append(value);
            }
            body = combined.toString();
        }

        String sourceText = (title + " " + body).trim();
        String normalized = normalize(sourceText);
        if (normalized.contains("rechazad") || normalized.contains("no fue aprobada") || normalized.contains("no se pudo realizar")) return null;
        String type = detectType(normalized);
        if (type == null) return null;
        String flow = type.equals("transferencia") ? detectFlow(normalized) : null;
        Amount amount = detectAmount(sourceText);
        if (amount == null || amount.value <= 0) return null;

        String source = appLabel(sbn.getPackageName());
        String description = cleanDescription(type, source);
        String accountHint = type.equals("gasto") && (normalized.contains("tarjeta") || normalized.contains("mastercard") || normalized.contains("visa"))
            ? "tarjeta_credito" : isWalletPackage(sbn.getPackageName()) ? "nequi_daviplata" : "banco";
        long postTime = sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis();
        SimpleDateFormat dateFormatter = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
        dateFormatter.setTimeZone(TimeZone.getDefault());
        String date = dateFormatter.format(new Date(postTime));
        String localNotificationKey = sbn.getKey();

        JSONObject item = new JSONObject();
        try {
            item.put("id", UUID.randomUUID().toString());
            item.put("localNotificationKey", localNotificationKey);
            item.put("amount", amount.value);
            item.put("currency", amount.currency);
            item.put("type", type);
            if (flow != null) item.put("flow", flow);
            item.put("date", date);
            item.put("description", description);
            item.put("source", source);
            item.put("accountHint", accountHint);
            item.put("detectedAt", postTime);
        } catch (JSONException ignored) {
            return null;
        }
        return item;
    }

    private static String detectType(String text) {
        if (containsAny(text, "transferencia", "transferiste", "enviaste", "te enviaron", "te transfirieron", "pago de tarjeta", "pago tarjeta", "abono a tarjeta")) return "transferencia";
        if (containsAny(text, "recibiste", "recibio", "recibió", "abono", "consignacion", "ingreso recibido", "pago recibido")) return "ingreso";
        if (containsAny(text, "compra", "retiro", "pagaste", "pago", "debito", "compra aprobada", "se debito", "realizaste un pago")) return "gasto";
        return null;
    }

    private static String detectFlow(String text) {
        if (containsAny(text, "recibiste", "te enviaron", "te transfirieron", "transferencia recibida", "transferida a tu cuenta", "abono a tu cuenta")) return "entrada";
        if (containsAny(text, "transferiste", "enviaste", "transferencia enviada", "transferencia realizada", "pago de tarjeta", "pago tarjeta", "abono a tarjeta")) return "salida";
        return null;
    }

    private String appLabel(String packageName) {
        try {
            CharSequence label = getPackageManager().getApplicationLabel(getPackageManager().getApplicationInfo(packageName, 0));
            if (label != null && !label.toString().trim().isEmpty()) return label.toString().trim();
        } catch (Exception ignored) { }
        return packageName;
    }

    private static boolean isWalletPackage(String packageName) {
        return "com.nequi.MobileApp".equals(packageName)
            || "com.davivienda.daviplataapp".equals(packageName)
            || "co.gov.bancoagrario.bico".equals(packageName);
    }

    private static Amount detectAmount(String text) {
        Matcher matcher = CURRENCY_AMOUNT.matcher(text);
        String currency = "COP";
        String raw = null;
        if (matcher.find()) {
            String token = matcher.group(1).toUpperCase(Locale.ROOT);
            String surrounding = text.substring(Math.max(0, matcher.start() - 4), Math.min(text.length(), matcher.end() + 8)).toUpperCase(Locale.ROOT);
            currency = token.contains("USD") || token.contains("US$") || surrounding.contains("USD") || surrounding.contains("DOLAR") ? "USD" : "COP";
            raw = matcher.group(2);
        } else {
            matcher = SUFFIX_AMOUNT.matcher(text);
            if (matcher.find()) {
                raw = matcher.group(1);
                currency = matcher.group(2).equalsIgnoreCase("USD") ? "USD" : "COP";
            }
        }
        if (raw == null || !NUMBER_PART.matcher(raw).matches()) return null;
        try {
            String normalized = raw;
            int lastDot = normalized.lastIndexOf('.');
            int lastComma = normalized.lastIndexOf(',');
            if (lastDot >= 0 && lastComma >= 0) {
                if (lastComma > lastDot) normalized = normalized.replace(".", "").replace(',', '.');
                else normalized = normalized.replace(",", "");
            } else if (lastComma >= 0) {
                int decimalDigits = normalized.length() - lastComma - 1;
                normalized = decimalDigits == 2 ? normalized.replace(".", "").replace(',', '.') : normalized.replace(",", "");
            } else if (lastDot >= 0) {
                int decimalDigits = normalized.length() - lastDot - 1;
                normalized = (normalized.indexOf('.') != lastDot || decimalDigits == 3) ? normalized.replace(".", "") : normalized;
            }
            return new Amount(Double.parseDouble(normalized), currency, raw);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static String cleanDescription(String type, String source) {
        String label = type.equals("ingreso") ? "Ingreso detectado · "
            : type.equals("transferencia") ? "Transferencia detectada · "
            : "Pago detectado · ";
        return label + source;
    }

    private static String text(CharSequence value) {
        return value == null ? "" : value.toString().replace('\n', ' ').trim();
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    private static boolean containsAny(String value, String... needles) {
        for (String needle : needles) if (value.contains(normalize(needle))) return true;
        return false;
    }

    private void saveIfNew(JSONObject item) {
        synchronized (BankNotificationListener.class) {
            JSONArray current;
            try {
                current = new JSONArray(getSharedPreferences(PREFS, MODE_PRIVATE).getString(QUEUE_KEY, "[]"));
            } catch (JSONException ignored) {
                current = new JSONArray();
            }
            try {
                JSONArray next = new JSONArray();
                String incomingKey = item.optString("localNotificationKey");
                long incomingTime = item.optLong("detectedAt");
                for (int i = 0; i < current.length(); i++) {
                    JSONObject entry = current.optJSONObject(i);
                    if (entry == null) continue;
                    boolean sameRecentNotification = !incomingKey.isEmpty()
                        && incomingKey.equals(entry.optString("localNotificationKey"))
                        && Math.abs(incomingTime - entry.optLong("detectedAt")) <= 5 * 60 * 1000;
                    if (sameRecentNotification) {
                        item.put("id", entry.optString("id"));
                    } else next.put(entry);
                }
                next.put(item);
                JSONArray bounded = new JSONArray();
                int first = Math.max(0, next.length() - MAX_PENDING);
                for (int i = first; i < next.length(); i++) bounded.put(next.getJSONObject(i));
                getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(QUEUE_KEY, bounded.toString()).apply();
            } catch (JSONException ignored) {
                // Never log financial notification contents.
            }
        }
    }

    static JSONArray pending(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(QUEUE_KEY, "[]");
        try {
            JSONArray stored = new JSONArray(raw);
            JSONArray drafts = new JSONArray();
            for (int i = 0; i < stored.length(); i++) {
                JSONObject entry = stored.optJSONObject(i);
                if (entry == null) continue;
                JSONObject draft = new JSONObject(entry.toString());
                draft.remove("localNotificationKey");
                drafts.put(draft);
            }
            return drafts;
        } catch (JSONException ignored) { return new JSONArray(); }
    }

    static void remove(Context context, String id) {
        synchronized (BankNotificationListener.class) {
            JSONArray current;
            try {
                current = new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(QUEUE_KEY, "[]"));
            } catch (JSONException ignored) {
                current = new JSONArray();
            }
            JSONArray next = new JSONArray();
            for (int i = 0; i < current.length(); i++) {
                JSONObject entry = current.optJSONObject(i);
                if (entry != null && !id.equals(entry.optString("id"))) next.put(entry);
            }
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(QUEUE_KEY, next.toString()).apply();
        }
    }

    private static final class Amount {
        final double value;
        final String currency;
        final String raw;
        Amount(double value, String currency, String raw) { this.value = value; this.currency = currency; this.raw = raw; }
    }
}
