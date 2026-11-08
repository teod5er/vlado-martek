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

**Ne pokretati `npm run placeholders`.** Skripta je iz ranije faze i u `public/works/books/` bi zapisala privremene SVG knjige.

## 3. Struktura

| Datoteka | Uloga |
|---|---|
| `index.html` | Kostur: loader, gornja traka, galerija, Pregled (mreža), Popis, stranice O autoru, Događanja i rad |
| `src/main.js` | Sva logika: jezik, zvuk, izbornik, prikazi, kategorije, stranica rada, O autoru, Događanja, rute, uvod |
| `src/gallery.js` | Carousel: istaknuti rad na glavnom stupcu, špil desno, prethodni lijevo; kotačić, drag, swipe |
| `src/sound.js` | Klik, listanje i „notch” zvuk kotačića |
| `src/style.css` | Sav izgled |
| `src/fonts/Malamocco-Medium.otf` | Jedino pismo (Malamocco Medium) |
| `public/data/works.json` | **Sav sadržaj** (vidi točku 6) |
| `public/works/books/` | Knjige: originalni PNG (2731 × 2731, prozirna pozadina), obrezani `*.webp` za stranicu rada i `*-thumb.webp` za galeriju |
| `public/works/*.svg` | Privremeni radovi (pune boje) u ostalim kategorijama |
| `public/img/` | Loader, `martek-1.jpg` i `martek-2.jpg`, kursori, OG slika |
| `scripts/build-offline.mjs` | Izrada offline datoteke |

## 4. Raspored (računalo)

**Grid (računalo): 12 stupaca.** Sve je definirano na vrhu `src/style.css`.
- **Rubovi i razmaci:** vanjski rub je `--pad` (`clamp(10px, 1.1vw, 22px)`), a razmak između stupaca `--gut` jednak je rubu. Cijela stranica tako ima jednu jedinicu razmaka.
- **Varijable:** `--col` je širina stupca, `--colg` stupac s razmakom, a `--span1` do `--span4` širine preko 1–4 stupca.
- **Linije:**
  - `--cs` je početak 4. stupca: glavni stupac (kategorije, putanja, naslov, istaknuti rad, stranica rada, popis, O autoru).
  - `--c2` je početak 7. stupca: drugi stupac (vrijednosti u tablici, godina u popisu, naziv na Događanjima).
  - `--ce` je kraj 9. stupca: ovdje završavaju slika, opis i tablica na stranici rada te tekst O autoru.
- **Galerija** (`src/gallery.js`, `metrics()`) računa isti grid: istaknuti rad počinje na 4. stupcu, špil se pomiče po jedan stupac, prethodni rad završava na kraju 2. stupca, a najveća širina rada je stupci 4–9.
- **Mreža:** 4 rada u redu, svaki preko 3 stupca, cijelom širinom.
- **Popis:** sličica i naslov na 4–6, godina na 7, kategorija na 8–9.
- **Mobitel:** zasebno. Glavni stupac je na rubu (10 px), mreža ima 2 stupca.

Stranica je okvir u dva reda: lijevi rub, glavni stupac (4. stupac) i desni rub vrijede i gore i dolje.

**Gornji red** je poravnat po vrhu: vrhovi velikih slova stoje na `--row` = `--pad`, oko 16 px.
- **Gore lijevo:** „Vlado” (crno) i „Martek” (crveno) u dva reda. Veličina `--name` je 2,6 × tekst navigacije, a smanjuje se ako ne stane prije kategorija. Oba imena vode na naslovnicu s bilo koje stranice.
- **Glavni stupac:** red kategorija „Početna Poezija Knjige …”. Trenutna je crna, ostale crvene. Nakon odabira piše **Početna / Knjige ×**: „Početna” je siva, kategorija crna, a X vraća na sve radove.
- **Gore desno:** traka alata u dvije skupine, odvojene tankom sivom crtom.
  - Lijevo od crte su ikone prikaza (galerija, mreža, popis), a na stranici rada umjesto njih brojač **‹ 05 / 21 ›**.
  - Desno od crte su **HR/EN** (trenutni jezik, klik prebacuje) i zvučnik (precrtan kad je zvuk isključen).
  - Položaj ikona računa se iz izmjerene širine desne skupine (`--prefs-w`).

**Donji red** stoji na zajedničkoj osnovnoj liniji.
- **Dolje lijevo:** Martekova sličica (kvadrat). Izmjenjuje `artist.photos` svakih 10 s (`PORTRAIT_EVERY`) i otvara stranicu O autoru. Drugi klik je zatvara.
- **Glavni stupac:** naslov i godina istaknutog rada, odmah, bez ispisivanja. U galeriji uvijek prikazuje istaknuti rad, a u Pregledu rad pod mišem.
- **Dolje desno:** „Exhibition: *naziv* →” u tankom crvenom obrubu, iz prvog unosa u `events`. Otvara Događanja.

Uz donji rub je uvijek blaga siva sjena (`.bottom-fade`).

**Mobitel:**
- Gore je izbornik kategorija na klik (chevron), a ikone prikaza i jezik/zvuk gore desno.
- Imena se skrivaju nakon splasha.
- Izložba je dolje desno i skrivena je na otvorenom radu.
- Brojač na radu je ispod gornjeg reda.

## 5. Prikazi i stranice

- **Galerija:** istaknuti rad visok 47 % ekrana, špil desno, bez blura. Pozadina je siva (`#E4E4E4`).
- **Pregled (mreža):** četiri rada u redu, svaki preko 3 stupca, cijelom širinom (na mobitelu dva), kvadratna polja. Radovi se pojavljuju jedan za drugim (`revealSeq`, iz JS-a, jer CSS animacija vidljivosti u Chromeu zna ostaviti stavku skrivenom).
- **Popis:** po red za svaki rad: sličica i naslov (stupci 4–6), godina crveno (7), kategorija (8–9), do desnog ruba.
- **Stranica rada:** samostalna, ista bez obzira odakle se dolazi.
  - Hero je 80 % visine: slika što veća na glavnom stupcu, ispod nje veliki naslov i godina.
  - Pri skrolu veliki naslov nestane kad dođe do gornje trake, a putanja postane **Početna / Knjige / Naslov ×**.
  - Ispod hero dijela je svijetli panel (`--sheet`) s opisom, tablicom (Tehnika, Dimenzije, Godina) i dvije fotografije. Na dnu je podnožje s imenima.
  - X zatvara rad, „Početna” vodi na naslovnicu, a kategorija na tu kategoriju.
  - Prethodni i sljedeći rad: brojač, strelice na tipkovnici, swipe, vodoravni pomak na trackpadu. Skrol prema gore na vrhu zatvara rad.
- **O autoru:** tekst, četiri „karme” (svaka u svom okviru preko cijele širine stupca), fotografija i kontakt e-mail. Pozadina je jače zamućena. Zatvara se klikom bilo gdje.
- **Događanja:** zasebna stranica s putanjom **Početna / Događanja ×** i redovima *datum | naziv | mjesto*.
- **Rute:** `#/work/id`, `#/info`, `#/events`, `#/kategorija` (npr. `#/books`).

## 6. Sadržaj (`public/data/works.json`)

- **`artist`:**
  - `first`, `last`
  - `bio.hr` / `bio.en` (odlomci)
  - `karma` (parovi naslov/vrijednost)
  - `photos` (Martekove fotografije: O autoru i sličica dolje lijevo)
  - `email`
- **`categories`:** 7 kategorija (`id`, `label`, `label_en`). Polje `viewer` je ostatak iz 3D faze i ne koristi se.
- **`works`:** jedan unos po radu.
  - `id`, `title`, `year`, `category`, `medium`, `description`, `en: { title, medium, description }`
  - `image`, `thumb`, `aspect` (širina / visina), po želji `cutout: true` (prozirna pozadina)
  - `width` i `height` ili `size_label`, `photos` (dvije dodatne slike), `links` (trenutno skriveni)
  - Knjige imaju i `pages` i `pageAspect` (ostatak 3D faze, bezopasno).
- **`events`:** `title`, `dates`, `place`, `en: { … }`. Prvi unos je natpis dolje desno.
- **`labels`:** `all` (Početna / Home) itd.
- **`cursors`:** prilagođeni pokazivači.

Nova knjiga: obrezati prozirne rubove, spremiti `ime.webp` (najviše 2000 px) i `ime-thumb.webp` (900 px) u `public/works/books/`, zatim dodati unos s `cutout: true` i točnim `aspect`.

## 7. Animacije (dogovoreni jezik)

- **Slike se kreću glatko, 1 s** (`cubic-bezier(.6, 0, .15, 1)`):
  - let slike pri otvaranju i zatvaranju rada (s mjesta klika i natrag)
  - prijelaz galerija ↔ mreža
  - ulazak radova u galeriju
  - klizanje slike pri prethodnom ili sljedećem radu
  - izmjena fotografija na stranici rada
- **Sučelje je grubo i tehničko:**
  - stranice (rad, Događanja, O autoru) pojave se i nestanu odjednom
  - imena nakon splasha skoče u kut u 8 koraka
  - naslov rada ulazi u 5 koraka
  - zamućenje pozadine u 3 koraka
- **Nigdje nema blijeđenja ni ispisivanja slovo po slovo.**
- **Promjena kategorije:** izbornik se promijeni odmah, a radovi uđu kao pri promjeni prikaza.
- **Splash:** pozadina `#FA0203`, animirani loader, „Vlado” lijevo i „Martek” desno na sredini, pa skok gore lijevo.
- **Zvuk** kreće tek nakon prve radnje korisnika (pravilo preglednika).

## 8. Otvorene stavke

1. **Kontakt:** `artist.email` je privremeni `info@example.com`.
2. **Izložba:** godina 2026 je pretpostavljena, prostor nije upisan, a ostala događanja nedostaju.
3. **Prijevodi:** engleski tekst O autoru i engleski naslovi knjiga prevedeni su na brzinu i treba ih provjeriti.
4. **Ostali radovi** (poezija, kiparstvo, akcije…) i dalje su privremeni SVG-ovi s privremenim tekstovima („Privremeni tekst.”). Knjige nemaju opise ni dimenzije.
5. **Originalni PNG-ovi knjiga** su u `public/works/books/` i ulaze u build (oko 24 MB koji se ne koriste). Treba ih premjestiti izvan `public/`.
6. **Open Graph:** `og:image` je relativan. Kad stranica dobije domenu, upisati apsolutni URL.
7. **Ostaci iz ranijih faza:** `viewer`, `pages`, `pageAspect`, `model`, `textures` u podacima i `scripts/make-placeholders.mjs` mogu se pobrisati.

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
