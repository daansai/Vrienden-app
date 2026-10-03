# Vrienden Run
Een renspel door een bruin café, in de stijl van Kaasje / de Chrome dino-game. Spring en buk om obstakels te ontwijken en maak je vrienden na als poppetjes (met eigen gezichtsfoto).

## Op je telefoon spelen

### Android (app downloaden)
1. Open op je telefoon de pagina **Releases** van deze repository en download **Vrienden-Run.apk** van de nieuwste release.
   Directe link: `https://github.com/daansai/Vrienden-app/releases/latest/download/Vrienden-Run.apk`
2. Open het bestand. Android vraagt eenmalig om het installeren van onbekende apps toe te staan voor je browser of bestanden-app.
3. Open **Vrienden Run** en draai je telefoon op zijn kant.

**Zegt je telefoon "App niet geïnstalleerd"?** Verwijder dan eerst de oude Vrienden Run-app (lang op het icoon drukken → Verwijderen) en installeer de nieuwste APK opnieuw. Eerdere bouwen waren met een andere sleutel ondertekend. Vanaf nu gebruikt elke bouw dezelfde sleutel (`keystore/`), dus nieuwe versies kun je gewoon over de oude heen installeren.

De APK wordt automatisch gebouwd door GitHub (workflow *Android-app (APK)*) bij elke wijziging op de hoofdbranch. Je kunt hem ook handmatig starten via **Actions → Android-app (APK) → Run workflow**.

### iPhone en Android (webapp, geen download nodig)
1. Zet eenmalig GitHub Pages aan: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Open daarna `https://daansai.github.io/Vrienden-app/` op je telefoon.
3. **Android (Chrome):** menu ⋮ → *App installeren* (of de knop "Installeer als app" in het menu).
   **iPhone (Safari):** tik op *Deel* → *Zet op beginscherm*.
De webapp werkt daarna ook zonder internet.

## Het spel
- **Bier, wijn of cocktail:** elk poppetje kiest wat het drinkt. Bier: groene flesjes. Wijn: wijnglazen, het glas loopt sneller leeg en een shotje vult er weinig van bij. Cocktail: loopt het langzaamst leeg.
- **Shotjes** vullen je glas weer een beetje bij (elk derde shotje vult het hele glas) en maken je wazig en wankelig.
- **Glas leeg = gewonnen.** Haal je de **3000 meter** of val je flauw, dan moet je opdrinken wat er nog in je glas zit.
- **Gouden drankje:** vliegt vaak sneller voorbij (ongeveer elke 6 tot 11 seconden). Elke pak telt als één slok om aan het einde uit te delen.
- **Moeilijkheid:** makkelijk, normaal of moeilijk.
- **Meerdere spelers:** maak voor iedereen een eigen poppetje en speel om de beurt. Na de laatste speler zie je wie het meest moet drinken.
- **Bonuswerelden (250 meter):** spring in het open vat (kelder, brouwerij of cocktailbar) of ren door de achterdeur (tarweveld, druivenveld of fruitplantage). Elke omgeving heeft eigen tafels, lampen, kratten en meer.
- **Afwisseling:** dansvloer met discobal elke 150 m, lange tafels om op te springen, verkeerspaaltjes.
- **Achtervolgers:** beveiliger, boze vrouw, dikke man in onderbroek, vader en moeder ("Je zou vanavond niet dronken worden!"). Ze ontwijken eerst een paar obstakels voordat ze struikelen.
- **Poppetjes-maker (cartoon-stijl: groot hoofd, dikke omlijning, vooraanzicht in menu's en zijaanzicht in het spel):** tabs met keuzeknoppen en een 🎲-knop. Man/vrouw, lengte, postuur, houding, bochel, borst, buik, billen, huid, ogen, kapsel, baard, bril, kleding uit vaste opties per kledingstuk (kleur en stof horen bij elkaar: o.a. raw denim, stonewash, melange, Breton-streep, tweed, krijtstreep, ruitjes, bloemenprint), realistischer haar met haarlijn, scheiding en strengen, schoenen, hoofddeksel en een foto van je eigen gezicht (blijft alleen op je apparaat).

## Besturing
↑ / spatie = springen (langer ingedrukt = hoger en verder), ↓ = bukken, Esc = hoofdmenu. Touchscreen: rechter helft = springen (vasthouden = hoger), linker helft = bukken. In de lucht bukken laat je meteen naar beneden gaan.

## Zelf bouwen
- Webversie: open `index.html` in een browser of serveer de map (`python3 -m http.server`).
- `node scripts/build-www.js` zet de app in `www/`; de Android-app wordt daarmee met Capacitor gebouwd (zie `.github/workflows/android.yml`).
