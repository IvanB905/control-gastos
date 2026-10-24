package com.ivanb905.finanza;

import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NotificationReader")
public class NotificationReaderPlugin extends Plugin {
    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasListenerAccess());
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("No se pudo abrir el acceso a notificaciones de Android.", error);
        }
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSObject result = new JSObject();
        result.put("notifications", BankNotificationListener.pending(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void removePending(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.trim().isEmpty()) {
            call.reject("Falta el identificador de la notificación.");
            return;
        }
        BankNotificationListener.remove(getContext(), id);
        call.resolve();
    }

    private boolean hasListenerAccess() {
        ComponentName listener = new ComponentName(getContext(), BankNotificationListener.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            NotificationManager manager = getContext().getSystemService(NotificationManager.class);
            return manager != null && manager.isNotificationListenerAccessGranted(listener);
        }
        String enabledListeners = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        return !TextUtils.isEmpty(enabledListeners) && enabledListeners.contains(listener.flattenToString());
    }
}
