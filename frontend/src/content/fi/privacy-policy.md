# Tietosuojakäytäntö

Päivitetty 2. tammikuuta 2026

## 1. Johdanto

Tervetuloa käyttämään **ft_transcendence**-palvelua, jota ylläpitää **The Transcenders** osana 42-koulun opetussuunnitelmaa.

Tämä tietosuojakäytäntö selittää, miten keräämme, käytämme, tallennamme ja suojaamme henkilötietojasi, kun käytät Pong-turnausalustaamme.

Käyttämällä ft_transcendence-palvelua hyväksyt tietojesi keräämisen ja käytön tämän käytännön mukaisesti.

## 2. Keräämämme tiedot

### 2.1 Tilin tiedot

Kun luot tilin, keräämme seuraavat tiedot:

- Sähköpostiosoite: tilin tunnistamiseen ja kirjautumiseen
- Käyttäjänimi: näkyy muille käyttäjille
- Salasana: tallennetaan salattuna hash-muodossa; emme näe oikeaa salasanaasi
- Profiilikuva/avatar, jos päätät ladata sellaisen.

### 2.2 Tunnistautumistiedot

Tuemme useita kirjautumistapoja:

- Sähköposti/salasana-kirjautuminen turvallisesti tallennetuilla tunnuksilla
- Google OAuth, jolloin saamme rajattuja profiilitietoja Googlelta
- Kaksivaiheisen tunnistautumisen koodit, jos otat 2FA:n käyttöön tilisi asetuksista.

### 2.3 Peli- ja alustatiedot

Keräämme ja tallennamme automaattisesti:

- Pelitilastot: voitot, tappiot ja ottelutulokset
- Turnausosallistumiset ja tulokset
- Otteluhistoria: pisteet, pelatut pelit ja vastustajat
- Kaverilista: yhteydet muihin käyttäjiin
- Online-tila: kun käytät alustaa aktiivisesti.

### 2.4 Tekniset tiedot

Keräämme vain välttämättömiä teknisiä tietoja:

- Paikallisesti tallennetut tiedot, jotka pitävät sinut kirjautuneena
- Selaimen tyyppi ja versio yhteensopivuuden varmistamiseksi
- Yhteyden aikaleimat turvallisuussyistä.

Emme kerää:

- Yksityiskohtaista selauskäyttäytymistä tai analytiikkaa
- Markkinointi- tai mainostietoja
- Maksutietoja, koska palvelu on ilmainen.

## 3. Miten käytämme tietojasi

### 3.1 Alustan toiminta

- Henkilöllisyytesi vahvistaminen ja tilisi ylläpito
- Pelaajien välisen matchmakingin mahdollistaminen
- Turnausten järjestäminen ja hallinta
- Pelitilastojen näyttäminen
- Yhteyksien luominen käyttäjien välille.

### 3.2 Alustan kehittäminen

- Alustan suorituskyvyn ja vakauden seuranta
- Teknisten ongelmien korjaaminen
- Pelimekaniikan ja käyttökokemuksen parantaminen.

### 3.3 Turvallisuus

- Huijaamisen ja väärinkäytön estäminen
- Luvattoman käytön havaitseminen ja estäminen
- Suojaaminen käyttöehtojen rikkomisilta.

## 4. Tietojen tallennus ja suojaus

### 4.1 Tietojen tallennus

- Kaikki tiedot tallennetaan paikallisesti 42-koulun infrastruktuuriin
- Tietoja ei siirretä kolmansille osapuolille (paitsi Google OAuth -kirjautumisen yhteydessä)
- Tietokannan käyttöoikeus on rajattu The Transcenders -kehitystiimille.

### 4.2 Turvatoimet

Käytämme alan standardien mukaisia suojauskäytäntöjä:

- Salatut salasanat: kaikki salasanat hashataan turvallisilla algoritmeilla
- HTTPS-salaus: kaikki tiedonsiirto on salattua
- Kaksivaiheinen tunnistautuminen: valinnaisesti käytettävissä lisäsuojaksi

Koska kyseessä on koulutusprojekti, emme voi taata täydellistä turvallisuutta. Käytä ainutlaatuista salasanaa ja ota 2FA käyttöön lisäsuojaksi.

## 5. Kolmannen osapuolen palvelut

### 5.1 Google OAuth

Jos kirjaudut Google OAuthin kautta:

- Saamme Googlelta perustason profiilitietoja (sähköposti, nimi)
- Google-salasanaasi ei koskaan jaeta meille
- Googlen tietojen käsittelyä säätelee [Googlen tietosuojakäytäntö](https://policies.google.com/privacy)
- Voit peruuttaa ft_transcendence-palvelun käyttöoikeuden Google-tilisi asetuksista.

### 5.2 42-koulu

Koska kyseessä on kouluprojekti:

- 42-koulun henkilökunta voi tarkastella alustan tietoja arviointitarkoituksiin
- Arvioijat voivat tarkastella käyttäjätilejä, pelitoimintoja ja tallennettuja tietoja
- Tämä käyttöoikeus on rajattu opetukselliseen arviointiin.

## 6. Tietojen jakaminen

Emme myy, vuokraa tai jaa henkilötietojasi kolmansille osapuolille, paitsi:

- Suostumuksellasi, jos sovellettavissa
- 42-koulun arvioijille projektin arviointia varten
- Kun laki sitä edellyttää.

Pelitilastosi ja otteluhistoriasi voivat olla näkyvissä muille käyttäjille tulostaulukoissa ja otteluhistorioissa.

## 7. Tietosuojaoikeutesi

### 7.1 Pääsy tietoihin

Voit tarkastella profiilitietojasi, pelitilastojasi ja otteluhistoriaasi tilisi kautta milloin tahansa.

### 7.2 Tietojen korjaaminen

Voit päivittää käyttäjänimesi, sähköpostiosoitteesi ja profiilikuvasi tiliasetuksissa.

## 8. Tietojen säilytys

Säilytämme tietojasi projektin valmistumiseen asti.

## 9. Projektin kesto

ft_transcendence on väliaikainen kouluprojekti. Kaikki käyttäjätilit ja tiedot poistetaan pysyvästi kolmannen arviointijakson päätyttyä.

## 10. Lasten tietosuoja

ft_transcendence ei ole tarkoitettu alle 18-vuotiaille käyttäjille. Emme tietoisesti kerää tietoja alaikäisiltä. Jos epäilet, että olemme keränneet alaikäisen tietoja, ota meihin välittömästi yhteyttä.

## 11. Muutokset tähän tietosuojakäytäntöön

Voimme päivittää tätä tietosuojakäytäntöä ajoittain. Muutokset julkaistaan tällä sivulla päivitetyn "Viimeksi päivitetty" -päivämäärän kanssa. Suosittelemme tarkistamaan tämän käytännön säännöllisesti.

Palvelun jatkokäyttö muutosten jälkeen katsotaan hyväksynnäksi päivitetylle käytännölle.

## 12. Yhteystiedot

Jos sinulla on kysymyksiä, huolia tai pyyntöjä tähän tietosuojakäytäntöön tai henkilötietoihisi liittyen, ota yhteyttä osoitteeseen hello@transcendence.fi.

---

Käyttämällä ft_transcendence-palvelua vahvistat lukeneesi ja ymmärtäneesi tämän tietosuojakäytännön.
