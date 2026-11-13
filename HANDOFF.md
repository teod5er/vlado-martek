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
| `src/fonts/Malamocco-Medium.otf` | Jedino pismo (Malamocco Medium) |
| `public/data/works.json` | **Sav sadržaj** (vidi točku 6) |
| `public/works/<kategorija>/` | Jedna mapa po kategoriji, nazvana po `id`-u (engleski): `poetry`, `books`, `sculpture`, `painting`, `actions`, `texts`, `photography`. Datoteke rada su samo u mapi njegove matične kategorije (prve u `categories`), bez kopija. |
| `public/works/books/` | Knjige: originalni PNG (2731 × 2731, prozirna pozadina), obrezani `*.webp` za stranicu rada i `*-thumb.webp` za galeriju |
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
- **Mreža:** od linije „Početna” (4. stupac), 3 rada u redu, svaki preko 2 stupca, s praznim stupcem između (4–5, 7–8, 10–11). Razmak između redova je 10 vh. Na mobitelu su 3 u redu, od ruba do ruba (samo rub stranice s obje strane).
- **Popis:** cijeli red, od linije „Početna” do desnog ruba: sličica (4,6 em) i naslov na 4–8, godina na 9–10, kategorija na 11–12.
- **Mobitel:** vlastiti grid od 6 stupaca (rub i razmak 10 px). Imena su na stupcima 1–2, a mreža (3 u redu) ide od ruba do ruba. Popis, stranica rada, Događanja i O autoru idu cijelom širinom, ispod imena.

Stranica je okvir u dva reda: lijevi rub, glavni stupac (4. stupac) i desni rub vrijede i gore i dolje.

**Gornji red** je poravnat po vrhu: vrhovi velikih slova stoje na `--row` = `--pad`, oko 16 px.
- **Gore lijevo:** „Vlado” (crno) i „Martek” (crveno) u dva reda. Veličina `--name` je 2,6 × tekst navigacije, a smanjuje se ako ne stane prije kategorija. Oba imena vode na naslovnicu s bilo koje stranice.
- **Glavni stupac:** red kategorija „Početna Poezija Knjige …”. Trenutna je crna, ostale crvene. Uz svaku kategoriju je broj radova u njoj, podignut kao eksponent (npr. Knjige¹¹, Početna = svi radovi; `catLabel` u `main.js`). Broj se računa sam iz `works.json`. Nakon odabira piše **Početna / Knjige ×**: „Početna” je siva, kategorija crna, a X vraća na sve radove.
- **Gore desno:** traka alata u dvije skupine, odvojene tankom sivom crtom.
  - Lijevo od crte su ikone prikaza (galerija, mreža, popis), a na stranici rada umjesto njih brojač **‹ 05 / 21 ›**.
  - Desno od crte su **HR/EN** (trenutni jezik, klik prebacuje) i zvučnik, ispunjen (precrtan kad je zvuk isključen).
  - Unutar skupine ikone su blizu (0,6 em), a skupine su razmaknute `--group-gap` sa svake strane crte. To je isti razmak kao rub stranice (`--pad`).
  - Položaj ikona računa se iz izmjerene širine desne skupine (`--prefs-w`).

**Donji red** stoji na zajedničkoj osnovnoj liniji.
- **Dolje lijevo:** Martekova sličica (kvadrat). Izmjenjuje `artist.photos` svakih 10 s (`PORTRAIT_EVERY`) i otvara stranicu O autoru. Drugi klik je zatvara.
- **Glavni stupac:** naslov i godina istaknutog rada, odmah, bez ispisivanja. U galeriji uvijek prikazuje istaknuti rad, a u Pregledu rad pod mišem.
- **Dolje desno:** „Exhibition: *naziv* →” u tankom crvenom obrubu, iz prvog unosa u `events`. Otvara Događanja.

Uz donji rub je uvijek sivi gradijent (`.bottom-fade`, boja stranice prema prozirnom, varijabla `--grey-fade`), u svim prikazima, na stranici rada i na Događanjima, tako da se naslov rada uvijek čita. Isti gradijent, okrenut, stoji ispod gornje trake na stranici rada i na Događanjima (`.overlay.detail::after`), umjesto nekadašnje trake u boji panela.

**Mobitel:**
- Imena gore lijevo kao na računalu.
- **Izbornik (prema primjeru `primjer.png`):** gore desno je crna riječ „Izbornik” / „Menu” (`#burger`), a lijevo od nje ikone prikaza (1,3 × veće, donjim rubom na liniji slova; `--burger-w`). Dok je izbornik otvoren, piše „Zatvori” / „Close”. Naslov rada je dolje lijevo, poravnat s imenima, iznad sličice. Izbornik kategorija, izložba te jezik i zvuk su na mobitelu skriveni.
  - Riječ otvara stranicu izbornika (`#mnav`) na boji pozadine. Imena, ikone prikaza i sličica ostaju vidljivi.
  - Sadržaj je poravnan prema dolje, prema sličici: kategorije velikim slovima s brojem radova (trenutna crna), a odmah ispod iste dvije ikone kao na računalu, jezik (HR / EN, dodir prebacuje) i zvučnik (precrtan kad je zvuk isključen).
  - Dok je izbornik otvoren, ikone prikaza se ne vide. Sličica zatvara izbornik i otvara O autoru.
  - Na Događanjima i O autoru riječ se skriva, jer te stranice imaju svoju putanju s ×. Na radu ostaje.
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
  - `lead.hr` / `lead.en` (rečenica iznad svega na stranici O autoru, manja i bijela)
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

Nova knjiga: obrezati prozirne rubove, spremiti `ime.webp` (najviše 2000 px) i `ime-thumb.webp` (900 px) u `public/works/books/`, zatim dodati unos s `"categories": ["books"]`, `cutout: true` i točnim `aspect`. Rad u više kategorija: datoteke u mapu prve kategorije, a ostale samo dopisati u `categories`, npr. `["books", "poetry"]`.

**Boja:** na cijeloj stranici je samo jedna crvena, `--red` (`#E63323`): tekst, splash, O autoru, favicon, ikona za iOS, OG slika i `theme-color`.

## 7. Animacije (dogovoreni jezik)

- **Sve se kreće malo trzavo, kao imena nakon splasha:** 16 koraka u sekundi. U CSS-u je to `--jerk` (`.5s steps(8, end)`), a u JS-u `stepped()` / `steppedCss()` iz `gallery.js` (zadržava krivulju, ali vrijeme ide u skokovima). Pod to spadaju i portret dolje lijevo i širenje retka na popisu. Jedino klizanje galerije kotačićem i prstom ostaje glatko, jer prati ruku.
- **Leteće slike (`.fly-layer`, z-index 3) idu ispod sivog prijelaza uz donji rub** (`.bottom-fade`, z-index 4), kao i radovi na koje slijeću. Prije su letjele iznad njega, pa bi se prijelaz pri slijetanju naglo pojavio.
- **Slike lete 1 s** (`cubic-bezier(.6, 0, .15, 1)` u 16 koraka):
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
- **Splash:** pozadina je ista crvena kao posvuda (`--red`, `#E63323`), animirani loader, a „Vlado / Martek” (oboje crno) stoji gore lijevo na svom mjestu, 1,6 × veće (`--splash-k`), pa se u 8 koraka smanji na svoju veličinu.
- **Zvuk** kreće tek nakon prve radnje korisnika (pravilo preglednika).
- **Kursor:** nasumični nacrtani kursor iz `cursors` (pri svakom učitavanju i kliku). Iznad svega što se može kliknuti je obična sistemska ruka. Crvena točka je maknuta.

## 8. Otvorene stavke

1. ~~Kontakt~~: `artist.email` je upisan (`vlado.martek@gmail.com`).
2. **Izložba:** godina 2026 je pretpostavljena, prostor nije upisan, a ostala događanja nedostaju.
3. **Prijevodi:** engleski tekst O autoru i engleski naslovi knjiga prevedeni su na brzinu i treba ih provjeriti.
4. **Privremeni radovi su obrisani** (svi SVG-ovi i „Privremeni tekst.”). Svi radovi su pravi, ali nijedan nema opis, a većina nema tehniku ni dimenzije. **Poezija** trenutno nema nijedan rad, pa je skrivena u izborniku. Pojavit će se sama kad dobije prvi rad.
5. **Originalni PNG-ovi** knjiga, skulptura i slika su u `public/works/` i ulaze u build (oko 92 MB koji se ne koriste). Treba ih premjestiti izvan `public/`.
8. **Popis radova (studeni 2026.):** naslovi, godine i kategorije usklađeni su s Martekovim popisom. Na stranici je 41 rad, tj. svi za koje postoji slika i jasan naslov. Radovi s popisa bez slike nisu dodani. **Kategorije su spojene:** Poezija i Autorske knjige → **Knjige**; Kiparstvo, Fotofigure i Fotografija → **Fotografije** (`photography`; datoteke iz `works/sculpture/` premještene su u `works/photography/`). Ostaju Samizdat, Slikarstvo, Akcije, Tekst i Parole, slogani (`slogans`, zasad prazna i skrivena). **Ništa se ne uparuje po pretpostavci:** slike `painting/zlatna-amerika`, `painting/bez-naziva` i `photography/razlog.png` nisu na stranici dok Martek ne kaže koji su to radovi, a `menti-lo-stato` je ostao „Menti lo stato” bez godine. Engleski naslovi novih radova prevedeni su na brzinu.
9. **Točka:** stranica sama dodaje točku iza svakog naslova (osim ako završava s ? ili !) i iza svakog broja u godini (2015./16., 1978.–2026.). U `works.json` se može pisati s točkom ili bez nje.
10. **Tablica rada:** Kategorija / Kategorije (sve kategorije rada, odvojene zarezom), Dimenzije (ako postoje), Godina. **Tehnika** se više ne prikazuje (polje `medium` ostaje u podacima).
- **Naslov kartice preglednika:** dok je rad otvoren, „Naslov. — Vlado Martek” (`setDocTitle`, prati i jezik), inače „Vlado Martek”.
- **Na kraju svakog rada** je sivi razdjelnik (bez naslova) i mreža ostalih radova iste kategorije, istog izgleda kao Pregled (`#detailMore`). Klik otvara rad na istoj stranici, od vrha.
- **Stranica rada na mobitelu:** gore desno je „Izbornik” kao na ostalim stranicama, putanja (kategorija ×) je pokraj imena, a Martekova sličica je dolje lijevo.
- **Stranica rada (prema `rad-novo.png`):** slika počinje ispod putanje (`--bar` + 10,5 vh) i završava tri ruba iznad naslova, koliko god redaka naslov imao (`layoutFigure` postavlja `bottom`). Strelice i brojač (`.detail-steps`) su dolje desno, na liniji godine, unutar hero dijela, pa odlaze sa skrolanjem (na mobitelu također).
12. **Amerike** (`americas`): nova kategorija. Dok je odabrana, cijela stranica je crna, uključujući i radove otvorene iz nje (`body.cat-americas` u `style.css` mijenja `--bg`, `--ink`, `--line`, `--sheet`, `--grey-fade`). Zasad je u njoj samo Ame_rika. Ostale radove treba odrediti Martek.
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
