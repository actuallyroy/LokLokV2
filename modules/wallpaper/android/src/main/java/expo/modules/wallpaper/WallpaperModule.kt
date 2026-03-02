package expo.modules.wallpaper

import android.app.WallpaperManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.BlurMaskFilter
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileOutputStream

// Data classes for stroke data (matching the app's Stroke interface)
class StrokeRecord : Record {
    @Field
    var id: String = ""

    @Field
    var path: String = ""  // SVG path string like "M 10 20 L 30 40"

    @Field
    var color: String = "#ffffff"

    @Field
    var strokeWidth: Double = 5.0
}

// Parsed point from SVG path
data class Point(val x: Float, val y: Float)

class WallpaperModule : Module() {
    companion object {
        private const val TAG = "WallpaperModule"
    }

    override fun definition() = ModuleDefinition {
        Name("Wallpaper")

        // Get current lockscreen wallpaper (no special permissions needed)
        AsyncFunction("getWallpaper") {
            val context = appContext.reactContext ?: return@AsyncFunction null
            getWallpaperPath(context)
        }

        // Set lockscreen wallpaper (requires SET_WALLPAPER permission)
        AsyncFunction("setLockscreenWallpaper") { imagePath: String ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            setLockscreenWallpaperFromPath(context, imagePath)
        }

        // Get screen dimensions for proper aspect ratio
        AsyncFunction("getScreenDimensions") {
            val context = appContext.reactContext ?: return@AsyncFunction null
            val displayMetrics = context.resources.displayMetrics
            mapOf(
                "width" to displayMetrics.widthPixels,
                "height" to displayMetrics.heightPixels,
                "density" to displayMetrics.density
            )
        }

        // Composite strokes onto background and set as lockscreen
        AsyncFunction("compositeAndSetLockscreen") {
            backgroundPath: String,
            strokes: List<StrokeRecord>,
            originalWidth: Double,
            originalHeight: Double ->

            val context = appContext.reactContext ?: return@AsyncFunction false
            compositeStrokesAndSetLockscreen(
                context,
                backgroundPath,
                strokes,
                originalWidth,
                originalHeight
            )
        }

        // Start foreground service to prevent app from being frozen
        AsyncFunction("startSyncService") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            try {
                Log.d(TAG, "Starting DrawingSyncService...")
                val intent = Intent(context, Class.forName("com.loklok.app.DrawingSyncService"))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                Log.d(TAG, "DrawingSyncService started")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Error starting sync service: ${e.message}")
                false
            }
        }

        // Stop foreground service
        AsyncFunction("stopSyncService") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            try {
                Log.d(TAG, "Stopping DrawingSyncService...")
                val intent = Intent(context, Class.forName("com.loklok.app.DrawingSyncService"))
                context.stopService(intent)
                Log.d(TAG, "DrawingSyncService stopped")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping sync service: ${e.message}")
                false
            }
        }

        // Check if battery optimization is ignored for this app
        AsyncFunction("isBatteryOptimizationIgnored") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
                powerManager.isIgnoringBatteryOptimizations(context.packageName)
            } else {
                true // Not applicable on older versions
            }
        }

        // Request battery optimization bypass
        AsyncFunction("requestBatteryOptimizationBypass") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${context.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    true
                } else {
                    true // Not needed on older versions
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error requesting battery optimization bypass: ${e.message}")
                false
            }
        }
    }

    private fun getWallpaperPath(context: Context): String? {
        return try {
            Log.d(TAG, "Getting wallpaper...")

            val wallpaperManager = WallpaperManager.getInstance(context)

            // Try to get lockscreen wallpaper first (API 24+)
            val drawable: Drawable? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    // Try to get lock screen wallpaper
                    val lockWallpaper = wallpaperManager.getDrawable()
                    lockWallpaper
                } catch (e: Exception) {
                    Log.d(TAG, "Could not get lock wallpaper, falling back to home: ${e.message}")
                    wallpaperManager.drawable
                }
            } else {
                wallpaperManager.drawable
            }

            if (drawable == null) {
                Log.d(TAG, "Wallpaper drawable is null")
                return null
            }

            Log.d(TAG, "Got drawable: ${drawable.javaClass.simpleName}")

            val bitmap = drawableToBitmap(drawable)
            if (bitmap == null) {
                Log.d(TAG, "Failed to convert to bitmap")
                return null
            }

            val path = saveBitmapToCache(context, bitmap, "current_wallpaper")
            Log.d(TAG, "Wallpaper saved to: $path")
            path
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception: ${e.message}")
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error: ${e.message}")
            e.printStackTrace()
            null
        }
    }

    private fun setLockscreenWallpaperFromPath(context: Context, imagePath: String): Boolean {
        return try {
            Log.d(TAG, "Setting lockscreen wallpaper from: $imagePath")

            // Remove file:// prefix if present
            val cleanPath = imagePath.removePrefix("file://")

            val file = File(cleanPath)
            if (!file.exists()) {
                Log.e(TAG, "Image file does not exist: $cleanPath")
                return false
            }

            val bitmap = BitmapFactory.decodeFile(cleanPath)
            if (bitmap == null) {
                Log.e(TAG, "Failed to decode bitmap from: $cleanPath")
                return false
            }

            val wallpaperManager = WallpaperManager.getInstance(context)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Set only lock screen wallpaper (API 24+)
                wallpaperManager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
                Log.d(TAG, "Lockscreen wallpaper set successfully")
            } else {
                // On older versions, this sets both home and lock screen
                wallpaperManager.setBitmap(bitmap)
                Log.d(TAG, "Wallpaper set successfully (pre-N)")
            }

            true
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception setting wallpaper: ${e.message}")
            false
        } catch (e: Exception) {
            Log.e(TAG, "Error setting wallpaper: ${e.message}")
            e.printStackTrace()
            false
        }
    }

    private fun drawableToBitmap(drawable: Drawable): Bitmap? {
        return try {
            if (drawable is BitmapDrawable) {
                return drawable.bitmap
            }

            val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 1080
            val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 1920

            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bitmap
        } catch (e: Exception) {
            Log.e(TAG, "Bitmap conversion error: ${e.message}")
            null
        }
    }

    private fun saveBitmapToCache(context: Context, bitmap: Bitmap, prefix: String): String {
        val file = File(context.cacheDir, "${prefix}_${System.currentTimeMillis()}.jpg")
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, 95, out)
        }
        return "file://${file.absolutePath}"
    }

    private fun compositeStrokesAndSetLockscreen(
        context: Context,
        backgroundPath: String,
        strokes: List<StrokeRecord>,
        originalWidth: Double,
        originalHeight: Double
    ): Boolean {
        return try {
            Log.d(TAG, "Compositing ${strokes.size} strokes onto background")

            // Get screen dimensions
            val displayMetrics = context.resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val screenHeight = displayMetrics.heightPixels

            // Load and scale background image
            val cleanPath = backgroundPath.removePrefix("file://")
            val file = File(cleanPath)
            if (!file.exists()) {
                Log.e(TAG, "Background image not found: $cleanPath")
                return false
            }

            // Decode with high quality options
            val options = BitmapFactory.Options().apply {
                inPreferredConfig = Bitmap.Config.ARGB_8888
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeFile(cleanPath, options)

            // For high quality, only downsample if image is much larger than screen
            // Use a minimum sample size to preserve quality
            val maxDimension = maxOf(options.outWidth, options.outHeight)
            val targetMaxDimension = maxOf(screenWidth, screenHeight) * 2 // Allow 2x for quality
            options.inSampleSize = if (maxDimension > targetMaxDimension) {
                (maxDimension / targetMaxDimension).coerceAtLeast(1)
            } else {
                1 // No downsampling for quality
            }
            options.inJustDecodeBounds = false
            options.inPreferredConfig = Bitmap.Config.ARGB_8888

            val originalBitmap = BitmapFactory.decodeFile(cleanPath, options)
            if (originalBitmap == null) {
                Log.e(TAG, "Failed to decode background image")
                return false
            }

            Log.d(TAG, "Original bitmap: ${originalBitmap.width}x${originalBitmap.height}, target: ${screenWidth}x${screenHeight}")

            // Scale and crop to screen size (cover mode - maintains aspect ratio)
            val scaledBitmap = scaleBitmapToCover(originalBitmap, screenWidth, screenHeight)

            Log.d(TAG, "Scaled bitmap: ${scaledBitmap.width}x${scaledBitmap.height}")

            // Create mutable copy for drawing
            val resultBitmap = scaledBitmap.copy(Bitmap.Config.ARGB_8888, true)
            val canvas = Canvas(resultBitmap)

            // Add unique random pixel in corner to force Android to recognize as new image
            // This bypasses wallpaper caching on some devices
            val uniqueMarkerPaint = Paint().apply {
                color = Color.argb(
                    1, // Nearly invisible alpha
                    (System.currentTimeMillis() % 256).toInt(),
                    ((System.currentTimeMillis() / 256) % 256).toInt(),
                    ((System.currentTimeMillis() / 65536) % 256).toInt()
                )
            }
            // Draw tiny marker in bottom-right corner (invisible to user)
            canvas.drawRect(
                (screenWidth - 2).toFloat(),
                (screenHeight - 2).toFloat(),
                screenWidth.toFloat(),
                screenHeight.toFloat(),
                uniqueMarkerPaint
            )

            // Calculate scale factors
            val scaleX = screenWidth.toFloat() / originalWidth.toFloat()
            val scaleY = screenHeight.toFloat() / originalHeight.toFloat()

            // Draw each stroke
            for (stroke in strokes) {
                // Parse SVG path string into points
                val points = parseSvgPath(stroke.path)
                if (points.size < 2) {
                    Log.d(TAG, "Skipping stroke with ${points.size} points, path: ${stroke.path.take(50)}")
                    continue
                }

                Log.d(TAG, "Drawing stroke with ${points.size} points, color: ${stroke.color}, width: ${stroke.strokeWidth}")

                val paint = Paint().apply {
                    color = parseColor(stroke.color)
                    strokeWidth = stroke.strokeWidth.toFloat() * scaleX
                    style = Paint.Style.STROKE
                    strokeCap = Paint.Cap.ROUND
                    strokeJoin = Paint.Join.ROUND
                    isAntiAlias = true

                    // Add neon glow effect
                    maskFilter = BlurMaskFilter(
                        stroke.strokeWidth.toFloat() * scaleX * 0.5f,
                        BlurMaskFilter.Blur.NORMAL
                    )
                }

                // Create path from parsed points
                val path = Path()
                val firstPoint = points[0]
                path.moveTo(
                    firstPoint.x * scaleX,
                    firstPoint.y * scaleY
                )

                for (i in 1 until points.size) {
                    val point = points[i]
                    path.lineTo(
                        point.x * scaleX,
                        point.y * scaleY
                    )
                }

                // Draw glow layer
                canvas.drawPath(path, paint)

                // Draw solid core on top
                val corePaint = Paint().apply {
                    color = parseColor(stroke.color)
                    strokeWidth = stroke.strokeWidth.toFloat() * scaleX * 0.6f
                    style = Paint.Style.STROKE
                    strokeCap = Paint.Cap.ROUND
                    strokeJoin = Paint.Join.ROUND
                    isAntiAlias = true
                }
                canvas.drawPath(path, corePaint)
            }

            // Clean up original bitmaps
            if (originalBitmap != scaledBitmap) {
                originalBitmap.recycle()
            }
            if (scaledBitmap != resultBitmap) {
                scaledBitmap.recycle()
            }

            // Save to a unique file first
            val timestamp = System.currentTimeMillis()
            val tempFile = File(context.cacheDir, "lockscreen_composite_$timestamp.png")
            FileOutputStream(tempFile).use { out ->
                resultBitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            Log.d(TAG, "Saved composite to: ${tempFile.absolutePath}, size: ${tempFile.length()} bytes")

            val wallpaperManager = WallpaperManager.getInstance(context)

            // Run wallpaper setting on main thread with delay for reliability
            val latch = java.util.concurrent.CountDownLatch(1)
            var setResult = false

            android.os.Handler(android.os.Looper.getMainLooper()).post {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        val bitmapForWallpaper = BitmapFactory.decodeFile(tempFile.absolutePath)
                        if (bitmapForWallpaper != null) {
                            // Set the new lock screen wallpaper directly (no clear needed)
                            val result = wallpaperManager.setBitmap(
                                bitmapForWallpaper,
                                null,
                                true,
                                WallpaperManager.FLAG_LOCK
                            )
                            Log.d(TAG, "setBitmap result: $result")
                            bitmapForWallpaper.recycle()
                            setResult = result > 0
                        }
                        Log.d(TAG, "Lockscreen wallpaper update attempted")
                    } else {
                        java.io.FileInputStream(tempFile).use { inputStream ->
                            wallpaperManager.setStream(inputStream)
                        }
                        Log.d(TAG, "Wallpaper set with setStream (pre-N)")
                        setResult = true
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error setting wallpaper on main thread: ${e.message}")
                } finally {
                    latch.countDown()
                }
            }

            // Wait for main thread to complete
            latch.await(10, java.util.concurrent.TimeUnit.SECONDS)
            if (!setResult) {
                Log.e(TAG, "Failed to set wallpaper on main thread")
                return false
            }

            // Clean up old composite files (keep only the latest)
            context.cacheDir.listFiles()?.filter {
                it.name.startsWith("lockscreen_composite_") && it.name != tempFile.name
            }?.forEach { it.delete() }

            resultBitmap.recycle()
            Log.d(TAG, "Lockscreen set successfully with composited drawing")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error compositing strokes: ${e.message}")
            e.printStackTrace()
            false
        }
    }

    private fun calculateInSampleSize(
        options: BitmapFactory.Options,
        reqWidth: Int,
        reqHeight: Int
    ): Int {
        val height = options.outHeight
        val width = options.outWidth
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2

            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }
        return inSampleSize
    }

    private fun parseColor(colorString: String): Int {
        return try {
            Color.parseColor(colorString)
        } catch (e: Exception) {
            Color.WHITE
        }
    }

    /**
     * Parse SVG path string into list of points
     * Handles "M x y L x y L x y ..." format
     */
    private fun parseSvgPath(pathString: String): List<Point> {
        val points = mutableListOf<Point>()

        try {
            // Split by commands (M, L, etc.) and extract coordinates
            val tokens = pathString.trim().split(Regex("\\s+"))
            var i = 0

            while (i < tokens.size) {
                val token = tokens[i]

                when {
                    token == "M" || token == "m" || token == "L" || token == "l" -> {
                        // Next two tokens should be x and y
                        if (i + 2 < tokens.size) {
                            val x = tokens[i + 1].toFloatOrNull()
                            val y = tokens[i + 2].toFloatOrNull()
                            if (x != null && y != null) {
                                points.add(Point(x, y))
                            }
                            i += 3
                        } else {
                            i++
                        }
                    }
                    token.toFloatOrNull() != null -> {
                        // Implicit lineto - two numbers in a row
                        val x = token.toFloatOrNull()
                        if (x != null && i + 1 < tokens.size) {
                            val y = tokens[i + 1].toFloatOrNull()
                            if (y != null) {
                                points.add(Point(x, y))
                                i += 2
                            } else {
                                i++
                            }
                        } else {
                            i++
                        }
                    }
                    else -> i++
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing SVG path: ${e.message}")
        }

        return points
    }

    /**
     * Scale and crop bitmap to fill target dimensions (like CSS cover)
     * Maintains aspect ratio and crops excess
     * Uses high-quality scaling for best results
     */
    private fun scaleBitmapToCover(source: Bitmap, targetWidth: Int, targetHeight: Int): Bitmap {
        val sourceWidth = source.width
        val sourceHeight = source.height

        val sourceAspect = sourceWidth.toFloat() / sourceHeight.toFloat()
        val targetAspect = targetWidth.toFloat() / targetHeight.toFloat()

        val scaledWidth: Int
        val scaledHeight: Int

        if (sourceAspect > targetAspect) {
            // Source is wider - scale by height, crop width
            scaledHeight = targetHeight
            scaledWidth = (targetHeight * sourceAspect).toInt()
        } else {
            // Source is taller - scale by width, crop height
            scaledWidth = targetWidth
            scaledHeight = (targetWidth / sourceAspect).toInt()
        }

        // Use high-quality scaling with Canvas for better results
        val scaledBitmap = Bitmap.createBitmap(scaledWidth, scaledHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(scaledBitmap)
        val paint = Paint().apply {
            isAntiAlias = true
            isFilterBitmap = true
            isDither = true
        }
        val srcRect = android.graphics.Rect(0, 0, sourceWidth, sourceHeight)
        val dstRect = android.graphics.Rect(0, 0, scaledWidth, scaledHeight)
        canvas.drawBitmap(source, srcRect, dstRect, paint)

        // Calculate crop position (center crop)
        val cropX = (scaledWidth - targetWidth) / 2
        val cropY = (scaledHeight - targetHeight) / 2

        // Crop to target size
        val croppedBitmap = Bitmap.createBitmap(
            scaledBitmap,
            cropX.coerceAtLeast(0),
            cropY.coerceAtLeast(0),
            targetWidth.coerceAtMost(scaledWidth),
            targetHeight.coerceAtMost(scaledHeight)
        )

        // Clean up scaled bitmap if it's different from cropped
        if (scaledBitmap != croppedBitmap) {
            scaledBitmap.recycle()
        }

        return croppedBitmap
    }
}
