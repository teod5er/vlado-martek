# Vlado Martek: handoff

Stanje na dan 8. 11. 2026. Ovo je glavna, aktivna verzija stranice. Ništa od izmjena iz ove faze nije commitano ni objavljeno.

## 1. Što je stranica

Dvojezična (HR/EN) portfolio stranica Vlade Marteka. Statična, bez backenda: Vite 6 i čisti JavaScript, bez ovisnosti u produkciji. Three.js i 3D preglednici su uklonjeni. Zvukovi su sintetizirani WebAudio, bez audio datoteka.

## 2. Pokretanje

```bash
npm install
npm run dev            # lokalni server, dostupan i s mobitela na istoj Wi-Fi mreži
npm run build          # produkcijska izrada u dist/
npm run preview        # posluži dist/
npm run build:offline  # dist-offline/vlado-martek.html, sve u jednoj datoteci (oko 7 MB)
```

`dist/` koristi relativne putanje, pa radi na bilo kojem hostingu i u podmapi. Otvoren dvoklikom (`file://`) ne radi, za to služi offline datoteka.


## 3. Struktura

| Datoteka | Uloga |
|---|---|
| `index.html` | Kostur: loader, gornja traka, galerija, Pregled (mreža), Popis, stranice O autoru, Događanja i rad |
| `src/main.js` | Sva logika: jezik, zvuk, izbornik, prikazi, kategorije, stranica rada, O autoru, Događanja, rute, uvod |
| `src/gallery.js` | Carousel: istaknuti rad na glavnom stupcu, špil desno, prethodni lijevo; kotačić, drag, swipe |
| `src/sound.js` | Klik, listanje i „notch” zvuk kotačića |
| `src/style.css` | Sav izgled |
| `src/fonts/Malamocco-Medium.woff2` | Jedino pismo (Malamocco Medium), 50 KB; `.otf` ostaje kao rezerva. Učitava se odmah (`preload` u `index.html`), a sav tekst osim splasha skriven je dok pismo ne stigne (`html.fonts`, `fontsIn` u `main.js`, najviše 3 s), pa nema bljeska drugog pisma. |
| `public/data/works.json` | **Sav sadržaj** (vidi točku 6) |
| `public/works/<kategorija>/` | Jedna mapa po kategoriji, nazvana po `id`-u (engleski): `poetry`, `books`, `sculpture`, `painting`, `actions`, `texts`, `photography`. Datoteke rada su samo u mapi njegove matične kategorije (prve u `categories`), bez kopija. |
| `public/works/books/` | Knjige: originalni PNG (2731 × 2731, prozirna pozadina), obrezani `*.webp` za stranicu rada i `*-thumb.webp` za galeriju |
| `public/img/` | Loader, `martek-1.jpg` i `martek-2.jpg`, kursori, OG slika |
| `scripts/build-offline.mjs` | Izrada offline datoteke |

## 4. Raspored (računalo)

**Grid (računalo): 12 stupaca.** Sve je definirano na vrhu `src/style.css`.
- **Rubovi i razmaci:** vanjski rub je `--pad` (`clamp(16px, 1.6vw, 30px)`, na mobitelu 16 px), a razmak između stupaca je `--gut` (`clamp(10px, 1.1vw, 22px)`, na mobitelu 10 px). Rub je namjerno malo veći od razmaka, da ništa ne bude nabijeno uz rub ekrana. `metrics()` u `gallery.js` računa iste vrijednosti.
- **Varijable:** `--col` je širina stupca, `--colg` stupac s razmakom, a `--span1` do `--span4` širine preko 1–4 stupca.
- **Linije:**
  - `--cs` je početak 4. stupca: glavni stupac (kategorije, putanja, naslov, istaknuti rad, stranica rada, popis, O autoru).
  - `--c2` je početak 7. stupca: drugi stupac (vrijednosti u tablici, godina u popisu, naziv na Događanjima).
  - `--ce` je kraj 9. stupca: ovdje završavaju slika, opis i tablica na stranici rada te tekst O autoru.
- **Galerija** (`src/gallery.js`, `metrics()`) računa isti grid: istaknuti rad počinje na 4. stupcu, špil se pomiče po jedan stupac, prethodni rad završava na kraju 2. stupca, a najveća širina rada je stupci 4–9.
- **Mreža:** od linije „Početna” (4. stupac), 3 rada u redu, svaki preko 2 stupca, s praznim stupcem između (4–5, 7–8, 10–11). Razmak između redova je 10 vh. Na mobitelu su 2 u redu (i u mreži ostalih radova na dnu rada), od ruba do ruba (samo rub stranice s obje strane).
- **Popis:** cijeli red, od linije „Početna” do desnog ruba: sličica (4,6 em) i naslov na 4–8, godina na 9–10, kategorija na 11–12.
- **Mobitel:** vlastiti grid od 6 stupaca (rub i razmak 10 px). Imena su na stupcima 1–2, a mreža (3 u redu) ide od ruba do ruba. Popis, stranica rada, Događanja i O autoru idu cijelom širinom, ispod imena.

Stranica je okvir u dva reda: lijevi rub, glavni stupac (4. stupac) i desni rub vrijede i gore i dolje.

**Gornji red** je poravnat po vrhu: vrhovi velikih slova stoje na `--row` = `--pad`, oko 16 px.
- **Gore lijevo:** „Vlado” (crno) i „Martek” (crveno) u dva reda. Veličina `--name` je 2,6 × tekst navigacije, a smanjuje se ako ne stane prije kategorija. Oba imena vode na naslovnicu s bilo koje stranice.
- **Glavni stupac:** red kategorija „Početna Poezija Knjige …”. Trenutna je crna, ostale crvene. Uz svaku kategoriju je broj radova u njoj, podignut kao eksponent (npr. Knjige¹¹, Početna = svi radovi; `catLabel` u `main.js`). Broj se računa sam iz `works.json`. Nakon odabira red kategorija ostaje, a odabrana je crna (na Amerikama bijela); putanje **Početna / Knjige ×** na računalu više nema (`#menuBack` ostaje u kodu, skriven).
- **Gore desno:** ikone prikaza (galerija, mreža, popis). **Dolje desno:** sivi **HR/EN** (trenutni jezik, klik prebacuje) i siva riječ **Sound** (precrtana kad je zvuk isključen; ista na oba jezika), na istoj osnovnoj liniji kao naslov i portret. Naslov rada staje prije njih (`--ex-w`). Na stranici rada umjesto ikona prikaza stoji brojač **‹ 05 / 21 ›**.

**Donji red** stoji na zajedničkoj osnovnoj liniji.
- **Dolje lijevo:** Martekova sličica (kvadrat). Izmjenjuje `artist.photos` svakih 10 s (`PORTRAIT_EVERY`) i otvara stranicu O autoru. Drugi klik je zatvara.
- **Glavni stupac:** naslov i godina istaknutog rada, odmah, bez ispisivanja. U galeriji uvijek prikazuje istaknuti rad, a u Pregledu rad pod mišem.
- **Dolje desno:** „Exhibition: *naziv* →” u tankom crvenom obrubu, iz prvog unosa u `events`. Otvara Događanja.

Uz donji rub je uvijek sivi gradijent (`.bottom-fade`, boja stranice prema prozirnom, varijabla `--grey-fade`), u svim prikazima, na stranici rada i na Događanjima, tako da se naslov rada uvijek čita. Isti gradijent, okrenut, stoji ispod gornje trake na stranici rada i na Događanjima (`.overlay.detail::after`), umjesto nekadašnje trake u boji panela.

**Mobitel:**
- Imena gore lijevo kao na računalu.
- **Izbornik (mobitel):** gore desno je crna riječ koja kaže što je prikazano, kao padajući izbornik: „Prikaži sve” / „Show all” ili naziv odabrane kategorije (npr. „Slikarstvo”); lijevo od nje su ikone prikaza (`--burger-w`). Iza riječi je crveni chevron (isti crtež kao na računalu, debljine 2,3 kao X; okrene se dok je otvoren). Dodir otvara padajući izbornik (`#mnav`): stavke poravnate desno, odmah ispod riječi, preko zamućene stranice (`backdrop-filter`); riječ postaje „Zatvori”. Stavke: „Prikaži sve” i kategorije (trenutna crna), ispod HR i zvučnik. Imena i sličica se dok je otvoren ne vide. Dodir izvan stavki zatvara izbornik. Izbornik kategorija, izložba te jezik i zvuk u gornjoj traci na mobitelu su skriveni.
  - Na Događanjima i O autoru riječ se skriva, jer te stranice imaju svoju putanju s ×. Na radu ostaje.
- Naslov istaknutog rada na mobitelu je dolje lijevo, poravnat s imenima, iznad sličice.
- **Naslov istaknutog rada** (dolje, `.hover-title`) je pola koraka veći od `--t1`: `--t1h` = `--t1` × √φ (1,272), na računalu i na mobitelu.
- Na mobitelu je osnovna veličina teksta veća (`--u: 14px`), a ikone prikaza su 1,3 × veće. Istaknuti rad u galeriji stoji po sredini ekrana (`x0` u `key()` u `gallery.js`), a niz radova desno od njega ide do ruba ekrana (četvrti ga presijeca).
- Na otvorenom radu: putanja je samo kategorija ×, brojač gore desno, a izložba i sličica dolje lijevo se skrivaju.

## 5. Prikazi i stranice

- **Galerija:** istaknuti rad visok 47 % ekrana, špil desno, bez blura. Pozadina je siva (`#E4E4E4`).
- **Pregled (mreža):** četiri rada u redu, svaki preko 3 stupca, cijelom širinom (na mobitelu dva), kvadratna polja. Radovi se pojavljuju jedan za drugim (`revealSeq`, iz JS-a, jer CSS animacija vidljivosti u Chromeu zna ostaviti stavku skrivenom).
- **Popis:** po red za svaki rad, cijelom širinom do desnog ruba: sličica i naslov (stupci 4–8), godina crveno (9–10), kategorija (11–12).
- **Stranica rada:** samostalna, ista bez obzira odakle se dolazi.
  - Hero je 90 % visine: slika što veća na glavnom stupcu, ispod nje veliki naslov i godina.
  - Pri skrolu veliki naslov nestane kad dođe do gornje trake, a putanja postane **Početna / Knjige / Naslov ×**. U istom trenutku nestanu i imena Vlado / Martek gore lijevo, a vrate se kad se skrola natrag gore.
  - Ispod hero dijela je svijetli panel (`--sheet`) od 4. stupca do desnog ruba: opis, tablica (Tehnika, Dimenzije, Godina) i dvije fotografije jedna do druge (na mobitelu jedna ispod druge). Svaka fotografija stoji u sivom kvadratu, cijela i u sredini, bez vrtuljka.
  - X zatvara rad, „Početna” vodi na naslovnicu, a kategorija na tu kategoriju.
  - Prethodni i sljedeći rad: brojač, strelice na tipkovnici, swipe, vodoravni pomak na trackpadu. Skrol prema gore na vrhu zatvara rad.
- **O autoru:** stranica u akcentnoj crvenoj (`--red`), sve na njoj crno (naslovi karmi bijeli), kao na splashu. Gore je putanja **Početna / O autoru ×**, a imena, jezik i zvuk ostaju iznad. Bijela rečenica (`artist.lead`), tekst veličine `--t2` (na mobitelu `--t1`) od 4. stupca do desnog ruba, četiri „karme” (svaka u svom okviru od 2 px, cijelom širinom teksta) i kontakt e-mail. Martekova sličica dolje lijevo naraste preko stupaca 1–2 i jedina je slika na stranici. Na istu veličinu naraste i pod mišem, na bilo kojoj stranici. Zatvara se na ×, na „Početna”, klikom bilo gdje ili na Escape.
- **Događanja:** zasebna stranica s putanjom **Početna / Događanja ×** i redovima *datum | naziv | mjesto*.
- **Rute:** `#/work/id`, `#/info`, `#/events`, `#/kategorija` (npr. `#/books`).

## 6. Sadržaj (`public/data/works.json`)

- **`artist`:**
  - `first`, `last`
  - `lead.hr` / `lead.en` (po želji: rečenica iznad svega na stranici O autoru, manja i bijela; trenutno maknuta)
  - `bio.hr` / `bio.en` (odlomci)
  - `karma` (parovi naslov/vrijednost)
  - `photos` (Martekove fotografije: O autoru i sličica dolje lijevo)
  - `email`
- **`categories`:** 7 kategorija (`id`, `label`, `label_en`). Polje `viewer` je ostatak iz 3D faze i ne koristi se.
- **`works`:** jedan unos po radu.
  - `categories`: popis kategorija kojima rad pripada (rad može biti u više kategorija). **Prva je matična**: u njezinoj su mapi datoteke rada i nju putanja pokazuje kad se rad otvori s Početne. Kad se otvori iz druge kategorije kojoj pripada, putanja pokazuje tu.
  - `id`, `title`, `year`, `medium`, `description`, `en: { title, medium, description }`
  - `image`, `thumb`, `aspect` (širina / visina), po želji `cutout: true` (prozirna pozadina)
  - `width` i `height` ili `size_label`, `photos` (dvije dodatne slike), `links` (trenutno skriveni)
  - Knjige imaju i `pages` i `pageAspect` (ostatak 3D faze, bezopasno).
- **`events`:** `title`, `dates`, `place`, `en: { … }`. Prvi unos je natpis dolje desno.
- **`labels`:** `all` (Početna / Home) itd.
- **`cursors`:** prilagođeni pokazivači.

**Stranica ne vidi datoteke sama.** Slika ubačena u mapu ne pojavljuje se dok za nju ne postoji unos u `works.json`. Isto tako, unos čija je datoteka obrisana ostaje prazan.

Nova knjiga: obrezati prozirne rubove, spremiti `ime.webp` (najviše 1600 px, kvaliteta 80) i `ime-thumb.webp` (640 px, kvaliteta 76) u `public/works/books/`, a originalni PNG u `originals/works/books/`, zatim dodati unos s `"categories": ["books"]`, `cutout: true` i točnim `aspect`. Rad u više kategorija: datoteke u mapu prve kategorije, a ostale samo dopisati u `categories`, npr. `["books", "poetry"]`.

**Boja:** na cijeloj stranici je samo jedna crvena, `--red` (`#E63323`): tekst, splash, O autoru, favicon, ikona za iOS, OG slika i `theme-color`.

## 7. Animacije (dogovoreni jezik, od 14. 11. 2026.)

Na zahtjev su trzavi pokreti u koracima (16 u sekundi) zamijenjeni glatkima. Tekst i stranice ulaze mekano.
- **Blago zastajkivanje (fina nedovršenost):** krivulje su glatke, ali vrijeme teče u sitnim skokovima od 24 koraka u sekundi (`ROUGH_FPS`, `rough` i `roughCss` u `gallery.js`, `EASE_OUT_FOR` i `--soft` u `main.js`). To vrijedi za letove slika, otvaranje rada, ulazak radova u galeriju, tekst koji izranja i CSS prijelaze. Glatko ostaje samo ono što prati ruku (kotačić, swipe, oznaka uz kursor) i galerija kad se sama pomiče (sinusna krivulja, 1,5 s, `AUTO_GLIDE` u `gallery.js`) i kratka blijeđenja stranica. Za jače zastajkivanje smanji `ROUGH_FPS` (16 je stari trzavi ritam), a za potpuno glatko ga povećaj na 60. Preglednici bez `linear()` (prije Safarija 17.2) dobivaju glatku krivulju.
- **Krivulje:** `--soft` / `EASE_OUT` (`cubic-bezier(.22, 1, .36, 1)`) za ono što ulazi, a `--glide` / `easeCss(.65, 0, .15, 1)` za ono što putuje s mjesta na mjesto (`gallery.js`, `main.js`, `style.css`).
- **Slike lete 0,95 s:** otvaranje i zatvaranje rada, prijelaz galerija ↔ mreža, ulazak radova u galeriju. Sljedeći ili prethodni rad klizne 40 px uz blijeđenje.
- **Tekst ulazi mekano** (`rise` u `main.js`: iz prozirnog, malo odozdo):
  - naslov istaknutog rada dolje i naslov rada (godina malo iza naslova);
  - redovi Događanja;
  - odlomci O autoru;
  - stavke izbornika na mobitelu;
  - radovi u Pregledu i Popisu, jedan za drugim (`revealSeq`).
- **Stranice** (rad, O autoru, Događanja) pojave se i nestanu kratkim blijeđenjem (`fadeIn`, `fadeOut`, klasa `is-closing`). Dok stranica nestaje, ispod se već vidi prikaz.
- **Ispod rada** detalji i ostali radovi mekano izrone kad se do njih skrola (`revealOnScroll`, `.rv`).
- **Uvod:** splash se glatko podiže prema gore (0,95 s, ista krivulja kao let slike, ali bez sitnih koraka), animacije naslovnice kreću 0,5 s kasnije (`INTRO_DELAY` u `main.js`), a imena izranjaju u kutu slovo po slovo. Za njima izranjaju kategorije, ikone prikaza, jezik i zvuk jedni za drugima (`revealBar`), i ponovno nakon povratka s rada ili Događanja.
- **Boje** poveznica i stanja mijenjaju se u 0,25 s.
- **Ostali pokreti:** Martekova sličica raste glatko, red u Popisu se širi glatko, a oznaka uz kursor ga prati glatko i pojavi se blijeđenjem.
- **Kursor:** pokazivač je crvena kockica (8 px; na crvenoj stranici O autoru crna), a iznad svega što se može kliknuti crna (na stranici O autoru i na crnim Amerikama bijela). Nasumični nacrtani piktogram iz `cursors` (novi pri svakom učitavanju i kliku) stoji odmah desno od kockice, malo ispod nje (44 px, gornji rub 8 px iznad kockice, `CF_UP`) (uz desni rub ekrana lijevo od nje), a oznaka uz kursor desno od piktograma (`.cfollow`, `initCursors` u `main.js`). Na Amerikama je piktogram bijel (`inv` / `inv2x`), a na overlayu Amerike skriven.
- **Zvuk** kreće tek nakon prve radnje korisnika.
- **Splash:** pozadina je `--red`, na njoj samo znak „10% artist”.
- **Smanjeno kretanje:** uz `prefers-reduced-motion` nema ni klizanja ni blijeđenja.

## 8. Otvorene stavke

1. ~~Kontakt~~: `artist.email` je upisan (`vlado.martek@gmail.com`).
2. **Izložba:** godina 2026 je pretpostavljena, prostor nije upisan, a ostala događanja nedostaju.
3. **Prijevodi:** engleski tekst O autoru i engleski naslovi knjiga prevedeni su na brzinu i treba ih provjeriti.
4. **Privremeni radovi su obrisani** (svi SVG-ovi i „Privremeni tekst.”). Svi radovi su pravi, ali nijedan nema opis, a većina nema tehniku ni dimenzije. **Poezija** trenutno nema nijedan rad, pa je skrivena u izborniku. Pojavit će se sama kad dobije prvi rad.
5. ~~Originalni PNG-ovi~~ su premješteni u `originals/works/…` (izvan `public/`, ne ulaze u build; oko 295 MB). Stranica koristi samo WebP: velike slike najviše 1600 px, sličice 640 px (ukupno oko 9 MB za 61 rad; build oko 12 MB). Splash čeka samo prvih 8 sličica prikazane kategorije, najviše 3 s, a ostale se učitavaju u pozadini. `loader.svg` je smanjen sa 680 na 125 KB (ugrađena slika pretvorena u WebP upola manje rezolucije). U donjoj galeriji rada je samo jedna fotografija: sam rad, ili `photos` ako ih rad ima.
8. **Popis radova (studeni 2026.):** naslovi, godine i kategorije usklađeni su s Martekovim popisom. Na stranici je sada 71 rad (zadnji dodani: Sve više se sramim poezije, 2024., i Granice! Unakazit ću vas izložbom!, bez godine, oba u Tekstovima i parolama; Blaženka ima novu, izrezanu sliku) (s Amerikama), tj. svi za koje postoji slika i jasan naslov. Radovi s popisa bez slike nisu dodani. **Kategorije su spojene:** Poezija i Autorske knjige → **Knjige**; Kiparstvo, Fotofigure i Fotografija → **Fotografije** (`photography`; datoteke iz `works/sculpture/` premještene su u `works/photography/`). Ostaju Samizdati, Slikarstvo, Akcije i **Tekstovi i parole** (`texts`; nekadašnja Parole, slogani `slogans` spojena je u nju, a datoteke iz `works/slogans/` premještene u `works/texts/`). Kategorije: Knjige, Samizdati, Slikarstvo, Akcije, Tekstovi i parole (engleski Texts), Fotografije, Amerike. **Ništa se ne uparuje po pretpostavci:** `painting/bez-naziva` je Bez naziva (1990., Slikarstvo), a `photography/razlog.png` je Friedrich Hölderlin (2002., Fotografije; datoteke `friedrich-holderlin`). Bivši „Balkan” iz 2014. je **Nove tendencije** (`nove-tendencije`), a „Balkan” 2008./26. je **Exat** (`exat`). Hannah Arendt i Pseudorimbaud imaju isti naslov na oba jezika. Zvijezde su zakrenute za 90° udesno. A `menti-lo-stato` je ostao „Menti lo stato” bez godine. Engleski naslovi novih radova prevedeni su na brzinu.
9. **Točka:** stranica sama dodaje točku iza svakog naslova (osim ako završava s ? ili !) i iza svakog broja u godini (2015./16., 1978.–2026.). U `works.json` se može pisati s točkom ili bez nje.
10. **Tablice na stranici rada više nema** (ni kategorije, ni godine, ni tehnike): ispod naslova je samo opis (ako postoji), fotografija i mreža ostalih radova iz kategorije. Polja `medium`, `width`, `height` ostaju u podacima.
- **Naslov kartice preglednika:** dok je rad otvoren, „Vlado Martek. Naslov.” (`setDocTitle`, prati i jezik), inače „Vlado Martek”.
- **Detalji ispod rada:** umjesto jedne velike slike ispod rada su tri manja kvadrata u redu (i na mobitelu): detalji izrezani iz izvorne slike ondje gdje je najviše crteža, rubova i boje (`details` u `works.json`, datoteke `<id>-d1.webp` … `-d3.webp`, 720 px). Izrađuje ih `scripts/make-details.py` (Pillow i numpy); za novi rad: `python3 scripts/make-details.py <id>`. Radovi s popisa `TWO` u skripti imaju samo dva detalja, jedan širi i jedan bliži (`-d1`, `-d2`), i oni stoje u dva stupca. Ako rad ima `photos`, prikazuju se one umjesto detalja.
- **Na kraju svakog rada** je sivi razdjelnik (bez naslova) i mreža ostalih radova iste kategorije, istog izgleda kao Pregled (`#detailMore`). Klik otvara rad na istoj stranici, od vrha.
- **O autoru na mobitelu** nema putanje „Početna / O autoru ×” (`#infoBar` skriven); stranica se zatvara dodirom bilo gdje. Sivi prijelaz uz donji rub na mobitelu je nešto niži.
- **„Amerika” u naslovima** uvijek s velikim početnim slovom (Crna Amerika, Čovjek je čovjeku Amerika).
- **Mobitel, provjereno u WebKitu (Safari):** slika rada stoji na stupcima 2–5 i po sredini, nikad od ruba do ruba. Dodatne fotografije su dvije u retku. O autoru ide od lijevog ruba cijelom širinom, sličica ostaje mala u kutu, a tekst se iznad nje stapa s pozadinom. Za testiranje: `npx playwright install webkit`, pa `devices['iPhone 14']`.
- **Stranica rada na mobitelu:** gore su samo imena (vode na Početnu) i „Prikaži sve” (ili naziv kategorije) gore desno. Putanje (kategorija ×) nema.
- **Na stranici rada nema Martekove sličice** u donjem lijevom kutu, ni na računalu ni na mobitelu.
- **Stranica rada (prema `rad-novo.png`):** slika počinje ispod putanje (`--bar` + 10,5 vh) i završava tri ruba iznad naslova, koliko god redaka naslov imao (`layoutFigure` postavlja `bottom`). Strelice i brojač (`.detail-steps`) su dolje desno, na liniji godine, unutar hero dijela, pa odlaze sa skrolanjem (na mobitelu također).
12. **Amerike** (`americas`): nova kategorija. Dok je odabrana, cijela stranica je crna (`#111111`), a sav tekst je u akcentnoj crvenoj (`#E63323`), uključujući i radove otvorene iz nje. `body.cat-americas` u `style.css` mijenja `--bg`, `--sheet`, `--veil`, `--grey-fade` u crnu, a `--red` i `--ink` u crvenu. Kvadrat s fotografijom ispod rada (`.strip-item`) je crven. O autoru zadržava svoju crvenu stranicu s crnim tekstom (`body.cat-americas.focus-info` vraća crnu). U njoj je 29 radova s Martekova popisa (slike iz mape `amerike` na radnoj površini). Novi radovi imaju datoteke u mapi svoje prve kategorije (uglavnom `painting`; Every Artist is Deluded by America u `texts`), a `americas` im je zadnja kategorija. U studenom 2026. dodani su Estetika über alles (2010.), Hoću Ameriku bez Amerike (2010.), Amerika na romobilu (2004.) i Prijedlog naslovnice knjige Miška Šuvakovića Point de Caption (1995.), svi `["painting", "americas"]`; sada su 34 rada u Amerikama (s Granice! Unakazit ću vas izložbom!). Slike `umjetnosti` i `pubertet-1` iz mape `amerike` i dalje nisu dodane. `painting/zlatna-amerika` je obrisana: ista je slika kao Hannah Arendt.
14. **Akcije, Istanbul 2025.:** Art Has No Alternative i Read Orwell (fotografije, `works/actions/`, bez `cutout`). **Avantgarda (2016., slikarstvo)** još čeka sliku.
15. **Pomak rada:** na otvorenom radu slika (`#detailFigure`) ostaje ravna i klizi suprotno od položaja miša, do 24 px na svaku stranu (`drift` u `main.js`; miš na sredini ekrana ostavlja je na mjestu). Na mobitelu klizi suprotno od nagiba mobitela, do 14 px (puni pomak pri 20° nagiba; `deviceorientation`, a kut u kojem je mobitel bio kad se rad otvorio je ravnina i polako prati ruku). Na iOS-u Safari pri prvom otvaranju rada traži dopuštenje za pokrete, a to radi samo preko HTTPS-a. Dok slika leti na mjesto, pomak miruje. Isključeno uz `prefers-reduced-motion`.
13. **Izložba dolje desno** otvara `events[0].url` u novoj kartici (stranica KGZ-a). Ako `url` ne postoji, otvara se stranica Događanja.
11. **Popis (lista):** pod pokazivačem se stupac sa sličicom u 8 koraka proširi za 30 % (`--thk` u `.list-row`), a naslov se odmakne.
6. **Open Graph:** `og:image` je relativan. Kad stranica dobije domenu, upisati apsolutni URL.
7. **Ostaci iz ranijih faza:** `viewer`, `pages`, `pageAspect`, `model`, `textures` u podacima mogu se pobrisati. (Skripta za privremene radove je obrisana.)

## 9. Druge verzije (ne dirati)

| Verzija | Mapa | Pregled |
|---|---|---|
| v1 | `/mnt/project-files/vlado-martek-v1` | https://claude.ai/artifact/2p2uNMbZzk6AbkSvgE27mC |
| v2 | `/mnt/project-files/vlado-martek-v2` | https://claude.ai/artifact/XHhpLQYsuA59soazExLeAg (privatno) |
| v3 (prije redizajna po gridu) | `/mnt/project-files/vlado-martek-v3` | nije zasebno objavljena |
| Verzija 67 (zadnja objavljena, s 3D) | | https://claude.ai/artifact/AVb7VJ5MEmhCCVyENjfShG |

## 10. Postupak objave izmjena

1. Izmijeni kod u ovoj mapi.
2. Pokreni `npm run build`, a zatim `npm run build:offline`.
3. Zapakiraj `dist/` u `vlado-martek-dist.zip`, a `dist-offline/vlado-martek.html` kopiraj u ovu mapu.
4. Za živi pregled objavi `dist/` na istu poveznicu artefakta (gore, verzija 67), da adresa ostane ista.

## 11. Pregled dizajna i brzine (14. 11. 2026.)

- **Slike na stranici rada:** odmah se prikaže sličica (već učitana), a velika slika je zamijeni tek kad se učita i dekodira (`setDetailImage` u `main.js`). Zatim se unaprijed učitaju susjedni radovi.
- **Pregled i Popis** učitavaju sličice kad se približe ekranu (`lazyImages`, `IntersectionObserver` unutar vlastitog okvira koji se skrola; `loading="lazy"` iOS Safari zna propustiti). Detalji i „ostali radovi” na dnu rada učitavaju se odmah. Slika koja ne uspije pokuša se još jednom.
- **Predučitavanje:** nakon uvoda sličice idu po tri odjednom, prvo one iz prikazane kategorije (`preloadThumbs`).
- **Galerija:** kartice imaju stalnu veličinu i miču se samo preko `transform` (bez promjene `width`/`height` u svakoj sličici). Kartice koje izađu s ekrana čuvaju se sa svojom slikom (`pool` u `gallery.js`). Rad pod mišem računa se iz položaja kartica, bez `elementFromPoint`. Dok je preko galerije rad, O autoru, Događanja ili izbornik na mobitelu, galerija se ne iscrtava (`covered`, `syncCover`).
- **Bez `mask-image`** na Pregledu, Popisu i O autoru: prijelaz uz gornji (na mobitelu na O autoru i donji) rub je fiksni gradijent. `.veil` postoji samo dok je otvoren izbornik kategorija, a prekrivači nemaju `backdrop-filter`.
- **Prijelazi na stranici rada** (gore i dolje) poprime boju svijetlog panela kad je panel ispod njih (`sheetFades`, `--sheet-fade`), pa nema sivih traka.
- **Mreže:** radovi stoje gore lijevo u svom kvadratu (isti vrh u redu).
- **Veliki tekst** (naslov dolje, naslov rada, „Događanja”) ima optičku korekciju lijevog ruba (−0,05 em), kao imena.
- **Mobitel:** sav mobilni CSS je u jednom bloku na kraju `style.css`. Sav sadržaj počinje na `--top`, a dijelovi stranice rada razmaknuti su za `--sec` (8vh; na računalu 12vh). Detalji ispod rada stoje jedan ispod drugoga. Na mobitelu nema putanja (ni na radu, ni na Događanjima, ni na O autoru); gore desno je uvijek riječ izbornika. Naslov stranice Događanja je `--t2`, kao naslov rada. U Popisu naslov počinje na 3. stupcu. Ikone prikaza stoje donjim rubom na osnovnoj liniji riječi izbornika (`--cap`: 0,72).

## 12. Studeni 2026.: splash, povećanje rada, Amerike

- **Splash:** na crvenom je samo znak „10% artist” (`loader.svg`, `min(28vw, 540px)`, najmanje 230 px), bez imena. Dok se splash podiže, prvo ulaze radovi, a kad njegov rub stigne do vrha, imena izranjaju u kutu slovo po slovo, prvo „Vlado”, pa „Martek” (`riseNames`, `playIntro`).
- **Povećanje rada:** klik ili dodir na sliku otvorenog rada otvara je preko svega, 1,5 × veću od slike prilagođene ekranu (`ZOOM`, `openZoom` u `main.js`, `.zoom`). Vidljivi dio prati kursor, a na mobitelu se povlači prstom. Zatvara se na × gore desno ili Escapeom.
- **Amerike:** kad se kategorija odabere, otvara se overlay preko cijele stranice (`#amer`, `openAmer`). Na njemu su naslov izložbe, podnaslov, trajanje i mjesto (16. 11. – 14. 12. 2026. · Knjižnica Bogdana Ogrizovića; `dates` i `place`), uvodna rečenica i cijeli tekst Saše Šimprage; najbitnije je bijelo (`**…**` u tekstu). Zatvara se na × gore desno ili Escapeom; ponovni klik na Amerike ga opet otvara. Sadržaj je u `works.json`, `categories[americas].intro` (`hr` / `en`; engleski je preveden na brzinu). Tekst je preuzet s najave KGZ-a uz male izmjene: „predstavljen ovdje” umjesto adrese weba, skraćeno objašnjenje kratice ASEEES, ispravljeni „Posljednji” i „2000.”.
- **Amerika kao kursor na overlayu:** `amerika.svg` s radne površine ugrađen je u `index.html` (`#amerMap`, `.amer-cursor`, 76 px), s crnom ispunom i bez titranja. Na overlayu zamjenjuje kursor miša (sredina oblika je na vrhu kursora), a iznad × je obična ruka. Samo za miš (`amerMap` u `main.js`).
- **Tipografija overlaya:** naslov, podnaslov i trajanje čine jedan blok; uvodna rečenica stoji 1,1 em ispod, tekst oko dva retka ispod nje, odlomci su 0,75 em razmaknuti, a potpis je redak ispod teksta.
- **Logotipi izložbe** (KGZ, Američki prostor, America 250; `logotipi izlozbe.svg` s radne površine) stoje na dnu teksta overlaya, ispod potpisa (`#amerLogos`). Ugrađeni su u `index.html`, a crvena iz datoteke zamijenjena je s `currentColor`, pa su crni na crvenom.
- **Box „Exhibition: …” dolje desno** je skriven (`#langBox`). Datumi u `events` ispravljeni su na 16. 11. – 14. 12. 2026.
- **Veličine (studeni 2026.):** imena „Vlado / Martek” su `--name: tm × 3` (bila 2,6). Na mobitelu smiju sezati do 42 % širine ekrana (`fitLabels`), a sadržaj počinje niže (`--top`: rub × 5,5 + ime × 1,7), da ne bude zbijen uz imena. Na mobitelu je istaknuti rad u galeriji veći (46 % visine, do četiri stupca; `metrics()` u `gallery.js`), a slika na stranici rada ide od sredine 1. do sredine 6. stupca.
- **Tražilice:** naslov stranice je „Vlado Martek. 10% Artist.” (`<title>`, `og:title`, `twitter:title` i naslov kartice kad nijedan rad nije otvoren). Opis je ažuriran na sadašnje kategorije. `public/robots.txt` sve dopušta i upućuje na `public/sitemap.xml` (samo naslovnica). Oba pretpostavljaju domenu `vladomartek.com`; ako stranica ostane na drugoj adresi, treba je ondje promijeniti.
- **Mobitel, donji red:** Martekova sličica je u donjem desnom kutu, a naslov i godina istaknutog rada dolje lijevo, na istoj liniji (`.about-btn`, `.hover-title` u mobilnom bloku `style.css`). Sivi prijelaz uz donji rub je zato niži.
- **Overlay Amerika:** na kraju teksta, iznad logotipa, je gumb „Otvori izložbu” / „See exhibition” (`#amerGo`, `go` u `works.json`): crna pozadina, crveni tekst; zatvara overlay i pokazuje radove. U tekstu `_riječ_` daje kurziv (npr. _Highway_); jedino pismo nema kurziv, pa je nagnut samo za to (`font-synthesis: style`).
- **Potpisi u mrežama** (Pregled i ostali radovi na dnu rada) izranjaju mekano, oko 0,2 s nakon svoje slike: pri otkrivanju mreže (`riseCap` u `revealSeq`), kad slika sleti iz galerije (`flyToIndex`) i pri skrolu ispod rada (`.rv .index-cap`).
- **Galerija na mobitelu je špil, potpuno centriran:** istaknuti rad je po sredini ekrana, a sljedeći stoje iza njega, svaki 6 % manji i također centriran, s gornjim rubovima koji vire 14 px (četiri u dubinu; `key()` u `gallery.js`, pomak `dy`). Sljedeći rad tako izlazi s vrha špila. Swipe baci prednju kartu ulijevo (ostaje iznad špila dok odlazi), a sljedeća dođe naprijed.
- **Overlay Amerika, tekst:** tekst je `text-wrap: pretty` (bez osamljene riječi u zadnjem retku), a naslov je u dva uravnotežena retka (`max-width: 11em`, `text-wrap: balance`). Na mobitelu su datum i mjesto u dva retka.
- **Samizdati** na engleskom su „Self-publishing” (`label_en` u `works.json`).
- **Overlay Amerika se sam otvara samo prvi put** kad se Amerike odaberu (pamti se u pregledniku, `localStorage` `vm-amer-seen`). Poslije se otvara samo klikom na Amerike dok su već odabrane (u izborniku na računalu ili mobitelu). Za ponovni prikaz pri testiranju: obrisati `vm-amer-seen` u pregledniku.

- **Zatvaranje rada:** dok slika leti natrag, njezino mjesto u galeriji, mreži ili popisu ostaje prazno (`holdPlace` u `main.js`), pa se isti rad nikad ne vidi dvaput.
- **Redoslijed u galeriji:** svaki rad leži na radovima iza sebe i taj se redoslijed ne mijenja dok se niz pomiče (`zIndex` u `frame()` u `gallery.js`). Rad koji odlazi klizne s vrha i otkrije sljedeći, pa nijedna slika više ne preskače drugu.
- **O autoru, dno stranice:** „Contact:” s adresom (`artist.email`) i „Design: T—P” s poveznicom na teopeter.work u novoj kartici (`#infoCredits`).
- **Otvoren rad:** čim se rad otvori, imena se sažmu u jedan red, a jezik, Sound i portret se sklone (`setCompact` s `now` u `openDetail`). Tako ostaje dok je rad otvoren, i na vrhu stranice.
- **Usklađenost:** imena i portret pri otvaranju i zatvaranju rada miču se u istom trajanju i krivulji kao slika (0,95 s; `--fly-ms`, `--fly-ease`, `body.names-back`).
- **Portret, HR i Sound** odlaze i vraćaju se zajedno: klize ispod donjeg ruba u istom trajanju i krivulji. Pri otvaranju rada nestaju odmah, a pri zatvaranju se vraćaju u ritmu leta slike.
- **Ulazak galerije** je potpuno gladak, bez sitnih koraka od 24 u sekundi (`enterEase` u `gallery.js`, prijelaz `.gallery` u `style.css`), kao i podizanje splasha.
- **Ujednačen gornji red:** imena i putanja imaju isti razmak između riječi (`--word`, razmak samog pisma). Slova imena su odvojena samo dok izranjaju, a poslije su običan tekst.
- **Znak na splashu** (`loader.svg`) iscrta se jednom i ostaje cijeli dok se splash ne podigne, koliko god učitavanje trajalo (prije se animacija vrtjela u krug i nakon 4 s počinjala ispočetka, s praznim znakom).
