package college.sparc.smsretriever

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import androidx.core.content.ContextCompat
import androidx.core.os.BundleCompat
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.MessageDigest

/**
 * Android SMS Retriever: OTP-র SMS-এর শেষে অ্যাপের ১১ অক্ষরের hash থাকলে Google Play services
 * সেই একটা SMS অ্যাপকে দেয় — READ_SMS অনুমতি ছাড়াই। অপেক্ষা ৫ মিনিট পর্যন্ত।
 */
class SmsRetrieverModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SparcSmsRetriever")

    Events("onSms")

    AsyncFunction("start") { promise: Promise ->
      stopReceiver()
      val ctx = context
      val r = object : BroadcastReceiver() {
        override fun onReceive(c: Context, intent: Intent) {
          if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
          val extras = intent.extras ?: return
          val status = BundleCompat.getParcelable(extras, SmsRetriever.EXTRA_STATUS, Status::class.java)
          when (status?.statusCode) {
            CommonStatusCodes.SUCCESS ->
              sendEvent("onSms", mapOf("message" to (extras.getString(SmsRetriever.EXTRA_SMS_MESSAGE) ?: "")))
            CommonStatusCodes.TIMEOUT -> sendEvent("onSms", mapOf("timeout" to true))
          }
          stopReceiver()
        }
      }
      ContextCompat.registerReceiver(
        ctx,
        r,
        IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
        SmsRetriever.SEND_PERMISSION,
        null,
        ContextCompat.RECEIVER_EXPORTED
      )
      receiver = r
      SmsRetriever.getClient(ctx).startSmsRetriever()
        .addOnSuccessListener { promise.resolve(true) }
        .addOnFailureListener { e ->
          stopReceiver()
          promise.reject("E_SMS_RETRIEVER", e.message ?: "startSmsRetriever failed", e)
        }
    }

    Function("stop") { stopReceiver() }

    // সার্ভারের SMS-এর শেষে যে hash বসাতে হবে (প্যাকেজ + সাইনিং সার্টিফিকেট থেকে)
    Function("getAppHashes") { appHashes(context) }

    OnDestroy { stopReceiver() }
  }

  private fun stopReceiver() {
    val r = receiver ?: return
    receiver = null
    try {
      appContext.reactContext?.unregisterReceiver(r)
    } catch (_: IllegalArgumentException) {
      // আগেই খোলা হয়েছে
    }
  }

  private fun appHashes(ctx: Context): List<String> {
    val pm = ctx.packageManager
    val pkg = ctx.packageName
    val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      val info = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES)
      info.signingInfo?.apkContentsSigners?.toList() ?: emptyList()
    } else {
      @Suppress("DEPRECATION")
      pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES).signatures?.toList() ?: emptyList()
    }
    return signatures.map { sig ->
      val digest = MessageDigest.getInstance("SHA-256")
      digest.update("$pkg ${sig.toCharsString()}".toByteArray(Charsets.UTF_8))
      val hash = digest.digest().copyOfRange(0, 9)
      Base64.encodeToString(hash, Base64.NO_PADDING or Base64.NO_WRAP).substring(0, 11)
    }
  }
}
