(function () {
  'use strict';
  // The country pins are geographical. Each explorable country is a miniature
  // travel diorama: places from different cities deliberately share one scene.
  window.FLASH_COUNTRIES = [
    { id: 'tr', name: 'Türkiye', flag: '🇹🇷', continent: 'Avrupa ve Asya', city: 'İstanbul ve Kapadokya', lat: 39, lon: 35,
      color: 0xe85847, sky: 0xa8dce9, ground: 0x9ebb82,
      intro: 'Türkiye’ye hoş geldin! İki kıtanın arasında koş, Galata Kulesi’ni gör ve Kapadokya’nın balonlarını izle.',
      places: [
        { id: 'galata', name: 'Galata Kulesi', fact: 'Galata Kulesi, İstanbul’un tarihî siluetinin en tanınan yapılarından biridir.', activity: 'Kulenin etrafında bir hız turu at!', x: -20, z: -12, kind: 'galata', radius: 6 },
        { id: 'bosphorus', name: 'İstanbul Boğazı', fact: 'İstanbul Boğazı’nın bir kıyısı Avrupa’da, diğer kıyısı Asya’dadır.', activity: 'Mavi suyun yanında iki kıtaya selam ver!', x: 18, z: -17, kind: 'suspension', radius: 9 },
        { id: 'cappadocia', name: 'Kapadokya', fact: 'Kapadokya, rüzgâr ve suyun şekillendirdiği kayalarıyla ünlüdür.', activity: 'Peribacalarının arasında koş ve uçan balonları bul!', x: 17, z: 13, kind: 'cappadocia', radius: 8 }
      ] },
    { id: 'us', name: 'Amerika Birleşik Devletleri', flag: '🇺🇸', continent: 'Kuzey Amerika', city: 'New York', lat: 40.71, lon: -74.01,
      color: 0x407bd3, sky: 0xaacde9, ground: 0xa4bb83,
      intro: 'New York’tasın! Özgürlük Heykeli, Brooklyn Köprüsü ve yemyeşil bir park seni bekliyor.',
      places: [
        { id: 'liberty', name: 'Özgürlük Heykeli', fact: 'Özgürlük Heykeli, New York Limanı’nda bir adada yükselir.', activity: 'Meşalenin önünde bir kahraman pozu ver!', x: -20, z: -12, kind: 'liberty', radius: 7 },
        { id: 'brooklyn', name: 'Brooklyn Köprüsü', fact: 'Brooklyn Köprüsü, New York’un Manhattan ve Brooklyn bölgelerini birbirine bağlar.', activity: 'Köprünün iki taş kulesinin arasından hızla geç!', x: 18, z: -17, kind: 'brooklyn', radius: 9 },
        { id: 'centralpark', name: 'Central Park', fact: 'Central Park, New York’un büyük binaları arasında bir şehir parkıdır.', activity: 'Parkın çember yolunda bir yıldırım turu at!', x: 17, z: 13, kind: 'park', radius: 7 }
      ] },
    { id: 'ca', name: 'Kanada', flag: '🇨🇦', continent: 'Kuzey Amerika', city: 'Niagara ve Toronto', lat: 43.09, lon: -79.08,
      color: 0xef7952, sky: 0xb4dbe8, ground: 0x8faf8c,
      intro: 'Kanada’ya geldin! Niagara’nın köpüren sularını, Toronto’nun kulesini ve buz hokeyini keşfet.',
      places: [
        { id: 'niagara', name: 'Niagara Şelaleleri', fact: 'Niagara Şelaleleri, Kanada ile Amerika Birleşik Devletleri sınırında yer alır.', activity: 'Şelalenin önünde su damlalarının yanından koş!', x: -20, z: -12, kind: 'falls', radius: 9 },
        { id: 'cntower', name: 'Toronto Kulesi', fact: 'Toronto’daki bu uzun kulenin tepesinden şehrin manzarası izlenebilir.', activity: 'Kulenin gölgesinden bir yıldırım gibi geç!', x: 18, z: -17, kind: 'cntower', radius: 6 },
        { id: 'hockey', name: 'Buz Hokeyi Alanı', fact: 'Buz hokeyi, Kanada’nın resmî kış sporudur.', activity: 'Küçük buz pistinin etrafında bir hız turu yap!', x: 17, z: 13, kind: 'hockey', radius: 8 }
      ] },
    { id: 'be', name: 'Belçika', flag: '🇧🇪', continent: 'Avrupa', city: 'Brüksel', lat: 50.85, lon: 4.35,
      color: 0xf0bd48, sky: 0xbddeef, ground: 0xa6bb84,
      intro: 'Brüksel’e hoş geldin! Parlak Atomium’u, Büyük Meydan’ı ve tatlı bir waffle durağını keşfet.',
      places: [
        { id: 'atomium', name: 'Atomium', fact: 'Atomium’un dokuz parlak küresi, bir demir kristalinin atomlarını temsil eder.', activity: 'Parlak küreleri say; toplam dokuz tane!', x: -20, z: -12, kind: 'atomium', radius: 8 },
        { id: 'grandplace', name: 'Büyük Meydan', fact: 'Brüksel’in Büyük Meydanı, süslü tarihî binalarıyla ünlüdür.', activity: 'Altın çatılı binaların önünde hızlı bir meydan turu at!', x: 18, z: -17, kind: 'grandplace', radius: 9 },
        { id: 'waffle', name: 'Waffle Durağı', fact: 'Brüksel waffle’ı, dışı çıtır ve içi yumuşak bir Belçika tatlısıdır.', activity: 'Waffle tezgâhına uğra; geziye tatlı bir mola ver!', x: 17, z: 13, kind: 'waffle', radius: 6 }
      ] },
    { id: 'fr', name: 'Fransa', flag: '🇫🇷', continent: 'Avrupa', city: 'Paris', lat: 48.86, lon: 2.35,
      color: 0x718bdf, sky: 0xc8dcf0, ground: 0xaebf8c,
      intro: 'Paris’tesin! Eyfel Kulesi’ne koş, Louvre’un cam piramidini bul ve Sen Nehri’nin kıyısını gez.',
      places: [
        { id: 'eiffel', name: 'Eyfel Kulesi', fact: 'Eyfel Kulesi, Paris’te Sen Nehri yakınında yükselen bir demir kuledir.', activity: 'Kulenin dört ayağının arasından yıldırım gibi geç!', x: -20, z: -12, kind: 'eiffel', radius: 7 },
        { id: 'louvre', name: 'Louvre Müzesi', fact: 'Louvre Müzesi’nin avlusundaki cam piramit, müzenin simgelerinden biridir.', activity: 'Cam piramidin çevresinde bir keşif turu yap!', x: 18, z: -17, kind: 'louvre', radius: 9 },
        { id: 'seine', name: 'Sen Nehri', fact: 'Sen Nehri, Paris’in içinden geçer; kıyılarında tarihî yapılar bulunur.', activity: 'Nehir kıyısından koş; küçük tekneyi bul!', x: 17, z: 13, kind: 'river', radius: 8 }
      ] },
    { id: 'ru', name: 'Rusya', flag: '🇷🇺', continent: 'Avrupa ve Asya', city: 'Moskova', lat: 55.75, lon: 37.62,
      color: 0xa476c9, sky: 0xc7dced, ground: 0xafc3a4,
      intro: 'Moskova’ya hoş geldin! Renkli kubbeler, kırmızı kuleler ve geniş bir meydan seni bekliyor.',
      places: [
        { id: 'basils', name: 'Aziz Vasil Katedrali', fact: 'Kızıl Meydan’daki Aziz Vasil Katedrali, renkli kubbeleriyle tanınır.', activity: 'Her biri farklı renk olan kubbeleri bul!', x: -20, z: -12, kind: 'basils', radius: 8 },
        { id: 'kremlin', name: 'Kremlin Kuleleri', fact: 'Moskova Kremlin’i, tarihî duvarları ve kuleleriyle çevrili bir yapı topluluğudur.', activity: 'Kırmızı kulelerin önünden bir süper hız turu at!', x: 18, z: -17, kind: 'kremlin', radius: 9 },
        { id: 'redsquare', name: 'Kızıl Meydan', fact: 'Kızıl Meydan, Kremlin’in ve Aziz Vasil Katedrali’nin yanında yer alır.', activity: 'Meydanın yıldızlı çemberini koşarak tamamla!', x: 17, z: 13, kind: 'square', radius: 7 }
      ] },
    { id: 'jp', name: 'Japonya', flag: '🇯🇵', continent: 'Asya', city: 'Tokyo ve Fuji', lat: 35.68, lon: 139.69,
      color: 0xed83a9, sky: 0xcde8f4, ground: 0xacc891,
      intro: 'Japonya’ya geldin! Fuji Dağı’nı, kırmızı bir tapınak kapısını ve pembe kiraz çiçeklerini keşfet.',
      places: [
        { id: 'fuji', name: 'Fuji Dağı', fact: 'Fuji, Japonya’nın en yüksek dağıdır ve sanatçılara ilham vermiştir.', activity: 'Karlı zirvenin önünde bir kahraman pozu ver!', x: -20, z: -12, kind: 'fuji', radius: 11 },
        { id: 'torii', name: 'Torii Kapısı', fact: 'Torii, Japonya’da Şinto tapınaklarının girişinde görülen geleneksel bir kapıdır.', activity: 'Kırmızı kapının altından hızla geç!', x: 18, z: -17, kind: 'torii', radius: 6 },
        { id: 'sakura', name: 'Kiraz Çiçeği Bahçesi', fact: 'Japonya’da ilkbaharda açan kiraz çiçeklerini izlemeye hanami denir.', activity: 'Pembe ağaçların arasından bir bahar turu at!', x: 17, z: 13, kind: 'sakura', radius: 8 }
      ] },
    { id: 'cn', name: 'Çin', flag: '🇨🇳', continent: 'Asya', city: 'Pekin', lat: 39.90, lon: 116.40,
      color: 0xe66a41, sky: 0xc2e0ed, ground: 0xadc58a,
      intro: 'Pekin’desin! Çin Seddi’nin kulelerini, Gök Tapınağı’nı ve bir bambu bahçesini gez.',
      places: [
        { id: 'greatwall', name: 'Çin Seddi', fact: 'Çin Seddi, farklı dönemlerde yapılmış duvarlar ve gözetleme kulelerinden oluşur.', activity: 'Kıvrılan duvarın boyunca bir hız turu yap!', x: -20, z: -12, kind: 'greatwall', radius: 10 },
        { id: 'heaven', name: 'Gök Tapınağı', fact: 'Pekin’deki Gök Tapınağı, yuvarlak yapıları ve kat kat çatılarıyla tanınır.', activity: 'Mavi çatının etrafında bir keşif turu at!', x: 18, z: -17, kind: 'heaven', radius: 8 },
        { id: 'bamboo', name: 'Bambu Bahçesi', fact: 'Bambu, Çin’de bahçelerde ve günlük yaşamda kullanılan bir bitkidir.', activity: 'Bambu saplarının arasındaki taş yolu bul!', x: 17, z: 13, kind: 'bamboo', radius: 7 }
      ] },
    { id: 'eg', name: 'Mısır', flag: '🇪🇬', continent: 'Afrika', city: 'Gize ve Nil', lat: 30.0, lon: 31.21,
      color: 0xe4b65d, sky: 0xd5e8ec, ground: 0xe1c187,
      intro: 'Mısır’a hoş geldin! Gize’nin piramitlerine koş, Büyük Sfenks’i bul ve Nil kıyısına uğra.',
      places: [
        { id: 'pyramids', name: 'Gize Piramitleri', fact: 'Gize Piramitleri, Eski Mısır’dan günümüze kalan büyük taş yapılardır.', activity: 'Üç piramidi birer birer bul!', x: -20, z: -12, kind: 'pyramids', radius: 11 },
        { id: 'sphinx', name: 'Büyük Sfenks', fact: 'Büyük Sfenks, Gize’deki insan başlı ve aslan gövdeli bir heykeldir.', activity: 'Sfenks’in önünde bir süper kahraman pozu ver!', x: 18, z: -17, kind: 'sphinx', radius: 8 },
        { id: 'nile', name: 'Nil Kıyısı', fact: 'Nil Nehri, Mısır’ın şehirleri ve tarım alanları için çok önemli bir su kaynağıdır.', activity: 'Palmiye ve yelkenli teknenin yanından koş!', x: 17, z: 13, kind: 'nile', radius: 8 }
      ] },
    { id: 'br', name: 'Brezilya', flag: '🇧🇷', continent: 'Güney Amerika', city: 'Rio de Janeiro', lat: -22.91, lon: -43.17,
      color: 0x62b982, sky: 0x9ddbec, ground: 0xa5cb88,
      intro: 'Rio’ya geldin! Tepedeki büyük heykeli, Şeker Tepesi’ni ve Copacabana sahilini keşfet.',
      places: [
        { id: 'christ', name: 'Kurtarıcı İsa Heykeli', fact: 'Rio’nun ünlü heykeli, Corcovado Dağı’nda kollarını iki yana açar.', activity: 'Heykelin önünde kollarını açan bir kahraman pozu ver!', x: -20, z: -12, kind: 'christ', radius: 8 },
        { id: 'sugarloaf', name: 'Şeker Tepesi', fact: 'Şeker Tepesi, Rio’da deniz kıyısında yükselen bir kaya tepesidir.', activity: 'Küçük teleferik kabinini bul!', x: 18, z: -17, kind: 'sugarloaf', radius: 10 },
        { id: 'copacabana', name: 'Copacabana Sahili', fact: 'Copacabana, Rio de Janeiro’nun Atlantik Okyanusu kıyısındaki ünlü sahillerindendir.', activity: 'Kumda koş; güneş şemsiyesi ve plaj topunu bul!', x: 17, z: 13, kind: 'beach', radius: 8 }
      ] }
  ];
  // These are deliberately chosen storybook seasons for the miniature scenes,
  // never a claim about today's weather or the climate of an entire country.
  var environments = {
    tr: { ground:'grass', weather:'clear', season:'ilkbahar', label:'Ilık ilkbahar', sky:0xb3dfe9, groundTint:0x83ad65, path:'paving', moisture:.08, waterColor:0x56b8c7, fogNear:46, fogFar:112, sunColor:0xffefd6, sunIntensity:2.6 },
    us: { ground:'grass', weather:'clear', season:'sonbahar', label:'Altın sonbahar', sky:0xc3daea, groundTint:0x9fab70, path:'paving', moisture:.10, waterColor:0x6ab5c3, fogNear:44, fogFar:108, sunColor:0xffe7be, sunIntensity:2.5 },
    ca: { ground:'snow', weather:'snow', season:'kış', label:'Yumuşak kar', sky:0xc4dce9, groundTint:0xecf3f7, path:'cleared', moisture:.25, waterColor:0x8dbfce, fogNear:38, fogFar:98, sunColor:0xf4f8ff, sunIntensity:2.1 },
    be: { ground:'grass', weather:'rain', season:'ilkbahar', label:'Yağmurlu ilkbahar', sky:0xb4cedc, groundTint:0x7faa6b, path:'paving', moisture:.80, waterColor:0x77afb9, fogNear:36, fogFar:100, sunColor:0xf2f7ff, sunIntensity:1.9 },
    fr: { ground:'grass', weather:'clear', season:'yaz', label:'Güneşli yaz', sky:0xbce0f0, groundTint:0x96b876, path:'paving', moisture:.05, waterColor:0x69bfcc, fogNear:48, fogFar:116, sunColor:0xffedce, sunIntensity:2.7 },
    ru: { ground:'snow', weather:'snow', season:'kış', label:'Karlı Moskova', sky:0xc7dcea, groundTint:0xe8f0f7, path:'cleared', moisture:.10, waterColor:0x93bacd, fogNear:36, fogFar:98, sunColor:0xeaf3ff, sunIntensity:2.0 },
    jp: { ground:'grass', weather:'petals', season:'ilkbahar', label:'Kiraz çiçeği baharı', sky:0xd4e8f1, groundTint:0x96b87b, path:'paving', moisture:.15, waterColor:0x81c6d0, fogNear:42, fogFar:110, sunColor:0xffe8e0, sunIntensity:2.4 },
    cn: { ground:'grass', weather:'mist', season:'ilkbahar', label:'Sisli bambu bahçesi', sky:0xc7dedb, groundTint:0x7faa73, path:'paving', moisture:.40, waterColor:0x83b8b9, fogNear:34, fogFar:96, sunColor:0xf1f3e5, sunIntensity:2.1 },
    eg: { ground:'sand', weather:'clear', season:'güneşli çöl', label:'Sıcak kumlar', sky:0xe3dfc8, groundTint:0xe2c284, path:'sand', moisture:0, waterColor:0x60b9c4, fogNear:48, fogFar:118, sunColor:0xffe1a9, sunIntensity:2.8 },
    br: { ground:'grass', weather:'rain', season:'tropikal yağmur', label:'Tropikal yağmur', sky:0xa8d0cd, groundTint:0x5ba466, path:'paving', moisture:.95, waterColor:0x5ab3bc, fogNear:36, fogFar:102, sunColor:0xeaf7ee, sunIntensity:2.0 }
  };
  window.FLASH_COUNTRIES.forEach(function (country) { country.environment = environments[country.id]; });
}());
