#!/usr/bin/env bash
# Past het gegenereerde Android-project aan: liggend scherm, beeldvullend, camera voor de gezichtsfoto en ons eigen icoon.
set -e
MANIFEST=android/app/src/main/AndroidManifest.xml
RES=android/app/src/main/res

# liggend scherm
sed -i '0,/<activity/s//<activity android:screenOrientation="sensorLandscape"/' "$MANIFEST"
# camera (voor de foto van je gezicht)
sed -i '0,/<application/s##<uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <application#' "$MANIFEST"

# beeldvullend (geen statusbalk)
STYLES="$RES/values/styles.xml"
if [ -f "$STYLES" ]; then
  sed -i 's#<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">#&\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>#' "$STYLES"
fi

# eigen icoon in alle formaten
ICON=icons/icon-512.png
for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  d=${pair%%:*}; s=${pair##*:}
  mkdir -p "$RES/mipmap-$d"
  convert "$ICON" -resize "${s}x${s}" "$RES/mipmap-$d/ic_launcher.png"
  cp "$RES/mipmap-$d/ic_launcher.png" "$RES/mipmap-$d/ic_launcher_round.png"
done
rm -rf "$RES/mipmap-anydpi-v26"   # zonder het adaptieve icoon gebruikt Android onze PNG's
echo "Android-project aangepast."

# Vaste ondertekening: elke bouw gebruikt dezelfde sleutel, zodat een nieuwe versie gewoon over de oude heen geïnstalleerd kan worden
# (zonder dit krijg je "App niet geïnstalleerd"). Elke bouw krijgt ook een hoger versienummer.
GRADLE=android/app/build.gradle
python3 - "$GRADLE" <<'PY'
import re, sys, os
p = sys.argv[1]
s = open(p).read()
block = """android {
    signingConfigs {
        debug {
            storeFile file("$rootDir/../keystore/vrienden.p12")
            storePassword 'vrienden123'
            keyAlias 'vriendenrun'
            keyPassword 'vrienden123'
            storeType 'pkcs12'
        }
    }
"""
s = re.sub(r'^android \{\n', block, s, count=1, flags=re.M)
run = os.environ.get('GITHUB_RUN_NUMBER', '1')
s = re.sub(r'versionCode \d+', 'versionCode ' + run, s, count=1)
s = re.sub(r'versionName "[^"]*"', 'versionName "1.0.' + run + '"', s, count=1)
open(p, 'w').write(s)
print('Ondertekening ingesteld, versionCode', run)
PY
