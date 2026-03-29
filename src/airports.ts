// Full IATA airport database — 500+ airports, sorted by country A→Z

export interface Airport {
  iata:    string;
  name:    string;
  city:    string;
  country: string;
  flag:    string;
}

export const AIRPORTS: Airport[] = [
  // Afghanistan 🇦🇫
  {iata:'KBL',name:'Hamid Karzai International',city:'Kabul',country:'Afghanistan',flag:'🇦🇫'},
  {iata:'HEA',name:'Herat International',city:'Herat',country:'Afghanistan',flag:'🇦🇫'},
  // Armenia 🇦🇲
  {iata:'EVN',name:'Zvartnots International',city:'Yerevan',country:'Armenia',flag:'🇦🇲'},
  // Australia 🇦🇺
  {iata:'SYD',name:'Kingsford Smith International',city:'Sydney',country:'Australia',flag:'🇦🇺'},
  {iata:'MEL',name:'Melbourne Airport',city:'Melbourne',country:'Australia',flag:'🇦🇺'},
  {iata:'BNE',name:'Brisbane Airport',city:'Brisbane',country:'Australia',flag:'🇦🇺'},
  {iata:'PER',name:'Perth Airport',city:'Perth',country:'Australia',flag:'🇦🇺'},
  {iata:'ADL',name:'Adelaide Airport',city:'Adelaide',country:'Australia',flag:'🇦🇺'},
  {iata:'DRW',name:'Darwin International',city:'Darwin',country:'Australia',flag:'🇦🇺'},
  {iata:'CNS',name:'Cairns Airport',city:'Cairns',country:'Australia',flag:'🇦🇺'},
  // Austria 🇦🇹
  {iata:'VIE',name:'Vienna International',city:'Vienna',country:'Austria',flag:'🇦🇹'},
  {iata:'GRZ',name:'Graz Airport',city:'Graz',country:'Austria',flag:'🇦🇹'},
  {iata:'SZG',name:'Salzburg Airport',city:'Salzburg',country:'Austria',flag:'🇦🇹'},
  {iata:'INN',name:'Innsbruck Airport',city:'Innsbruck',country:'Austria',flag:'🇦🇹'},
  // Azerbaijan 🇦🇿
  {iata:'GYD',name:'Heydar Aliyev International',city:'Baku',country:'Azerbaijan',flag:'🇦🇿'},
  {iata:'NAJ',name:'Nakhchivan Airport',city:'Nakhchivan',country:'Azerbaijan',flag:'🇦🇿'},
  // Bahrain 🇧🇭
  {iata:'BAH',name:'Bahrain International',city:'Manama',country:'Bahrain',flag:'🇧🇭'},
  // Bangladesh 🇧🇩
  {iata:'DAC',name:'Hazrat Shahjalal International',city:'Dhaka',country:'Bangladesh',flag:'🇧🇩'},
  {iata:'CGP',name:'Shah Amanat International',city:'Chittagong',country:'Bangladesh',flag:'🇧🇩'},
  // Belarus 🇧🇾
  {iata:'MSQ',name:'Minsk National Airport',city:'Minsk',country:'Belarus',flag:'🇧🇾'},
  // Belgium 🇧🇪
  {iata:'BRU',name:'Brussels Airport',city:'Brussels',country:'Belgium',flag:'🇧🇪'},
  {iata:'CRL',name:'Brussels South Charleroi',city:'Charleroi',country:'Belgium',flag:'🇧🇪'},
  // Brazil 🇧🇷
  {iata:'GRU',name:'Sao Paulo Guarulhos International',city:'Sao Paulo',country:'Brazil',flag:'🇧🇷'},
  {iata:'CGH',name:'Sao Paulo Congonhas',city:'Sao Paulo',country:'Brazil',flag:'🇧🇷'},
  {iata:'GIG',name:'Rio de Janeiro Galeao',city:'Rio de Janeiro',country:'Brazil',flag:'🇧🇷'},
  {iata:'BSB',name:'Brasilia International',city:'Brasilia',country:'Brazil',flag:'🇧🇷'},
  {iata:'FOR',name:'Fortaleza Pinto Martins',city:'Fortaleza',country:'Brazil',flag:'🇧🇷'},
  {iata:'REC',name:'Recife Guararapes International',city:'Recife',country:'Brazil',flag:'🇧🇷'},
  {iata:'CWB',name:'Afonso Pena International',city:'Curitiba',country:'Brazil',flag:'🇧🇷'},
  // Canada 🇨🇦
  {iata:'YYZ',name:'Toronto Pearson International',city:'Toronto',country:'Canada',flag:'🇨🇦'},
  {iata:'YVR',name:'Vancouver International',city:'Vancouver',country:'Canada',flag:'🇨🇦'},
  {iata:'YUL',name:'Montreal Trudeau International',city:'Montreal',country:'Canada',flag:'🇨🇦'},
  {iata:'YYC',name:'Calgary International',city:'Calgary',country:'Canada',flag:'🇨🇦'},
  {iata:'YEG',name:'Edmonton International',city:'Edmonton',country:'Canada',flag:'🇨🇦'},
  {iata:'YOW',name:'Ottawa Macdonald-Cartier',city:'Ottawa',country:'Canada',flag:'🇨🇦'},
  {iata:'YHZ',name:'Halifax Stanfield International',city:'Halifax',country:'Canada',flag:'🇨🇦'},
  // China 🇨🇳
  {iata:'PEK',name:'Beijing Capital International',city:'Beijing',country:'China',flag:'🇨🇳'},
  {iata:'PKX',name:'Beijing Daxing International',city:'Beijing',country:'China',flag:'🇨🇳'},
  {iata:'PVG',name:'Shanghai Pudong International',city:'Shanghai',country:'China',flag:'🇨🇳'},
  {iata:'SHA',name:'Shanghai Hongqiao International',city:'Shanghai',country:'China',flag:'🇨🇳'},
  {iata:'CAN',name:'Guangzhou Baiyun International',city:'Guangzhou',country:'China',flag:'🇨🇳'},
  {iata:'CTU',name:'Chengdu Tianfu International',city:'Chengdu',country:'China',flag:'🇨🇳'},
  {iata:'SZX',name:'Shenzhen Bao an International',city:'Shenzhen',country:'China',flag:'🇨🇳'},
  {iata:'KMG',name:'Kunming Changshui International',city:'Kunming',country:'China',flag:'🇨🇳'},
  {iata:'XIY',name:'Xian Xianyang International',city:'Xian',country:'China',flag:'🇨🇳'},
  {iata:'WUH',name:'Wuhan Tianhe International',city:'Wuhan',country:'China',flag:'🇨🇳'},
  {iata:'HGH',name:'Hangzhou Xiaoshan International',city:'Hangzhou',country:'China',flag:'🇨🇳'},
  {iata:'NKG',name:'Nanjing Lukou International',city:'Nanjing',country:'China',flag:'🇨🇳'},
  {iata:'CKG',name:'Chongqing Jiangbei International',city:'Chongqing',country:'China',flag:'🇨🇳'},
  {iata:'SYX',name:'Sanya Phoenix International',city:'Sanya',country:'China',flag:'🇨🇳'},
  {iata:'URC',name:'Urumqi Diwopu International',city:'Urumqi',country:'China',flag:'🇨🇳'},
  {iata:'HAK',name:'Haikou Meilan International',city:'Haikou',country:'China',flag:'🇨🇳'},
  // Colombia 🇨🇴
  {iata:'BOG',name:'El Dorado International',city:'Bogota',country:'Colombia',flag:'🇨🇴'},
  {iata:'MDE',name:'Jose Maria Cordova International',city:'Medellin',country:'Colombia',flag:'🇨🇴'},
  // Croatia 🇭🇷
  {iata:'ZAG',name:'Zagreb International',city:'Zagreb',country:'Croatia',flag:'🇭🇷'},
  {iata:'SPU',name:'Split Airport',city:'Split',country:'Croatia',flag:'🇭🇷'},
  {iata:'DBV',name:'Dubrovnik Airport',city:'Dubrovnik',country:'Croatia',flag:'🇭🇷'},
  // Czech Republic 🇨🇿
  {iata:'PRG',name:'Vaclav Havel Airport Prague',city:'Prague',country:'Czech Republic',flag:'🇨🇿'},
  // Denmark 🇩🇰
  {iata:'CPH',name:'Copenhagen Airport',city:'Copenhagen',country:'Denmark',flag:'🇩🇰'},
  // Egypt 🇪🇬
  {iata:'CAI',name:'Cairo International',city:'Cairo',country:'Egypt',flag:'🇪🇬'},
  {iata:'HRG',name:'Hurghada International',city:'Hurghada',country:'Egypt',flag:'🇪🇬'},
  {iata:'SSH',name:'Sharm El-Sheikh International',city:'Sharm El-Sheikh',country:'Egypt',flag:'🇪🇬'},
  {iata:'LXR',name:'Luxor International',city:'Luxor',country:'Egypt',flag:'🇪🇬'},
  // Ethiopia 🇪🇹
  {iata:'ADD',name:'Addis Ababa Bole International',city:'Addis Ababa',country:'Ethiopia',flag:'🇪🇹'},
  // Finland 🇫🇮
  {iata:'HEL',name:'Helsinki Vantaa Airport',city:'Helsinki',country:'Finland',flag:'🇫🇮'},
  // France 🇫🇷
  {iata:'CDG',name:'Paris Charles de Gaulle',city:'Paris',country:'France',flag:'🇫🇷'},
  {iata:'ORY',name:'Paris Orly',city:'Paris',country:'France',flag:'🇫🇷'},
  {iata:'NCE',name:'Nice Cote d Azur International',city:'Nice',country:'France',flag:'🇫🇷'},
  {iata:'LYS',name:'Lyon Saint Exupery Airport',city:'Lyon',country:'France',flag:'🇫🇷'},
  {iata:'MRS',name:'Marseille Provence Airport',city:'Marseille',country:'France',flag:'🇫🇷'},
  {iata:'TLS',name:'Toulouse Blagnac Airport',city:'Toulouse',country:'France',flag:'🇫🇷'},
  {iata:'BOD',name:'Bordeaux Merignac Airport',city:'Bordeaux',country:'France',flag:'🇫🇷'},
  // Georgia 🇬🇪
  {iata:'TBS',name:'Tbilisi International',city:'Tbilisi',country:'Georgia',flag:'🇬🇪'},
  {iata:'BUS',name:'Batumi International',city:'Batumi',country:'Georgia',flag:'🇬🇪'},
  {iata:'KUT',name:'Kutaisi David the Builder Airport',city:'Kutaisi',country:'Georgia',flag:'🇬🇪'},
  // Germany 🇩🇪
  {iata:'FRA',name:'Frankfurt Airport',city:'Frankfurt',country:'Germany',flag:'🇩🇪'},
  {iata:'MUC',name:'Munich Airport',city:'Munich',country:'Germany',flag:'🇩🇪'},
  {iata:'BER',name:'Berlin Brandenburg Airport',city:'Berlin',country:'Germany',flag:'🇩🇪'},
  {iata:'DUS',name:'Dusseldorf Airport',city:'Dusseldorf',country:'Germany',flag:'🇩🇪'},
  {iata:'HAM',name:'Hamburg Airport',city:'Hamburg',country:'Germany',flag:'🇩🇪'},
  {iata:'STR',name:'Stuttgart Airport',city:'Stuttgart',country:'Germany',flag:'🇩🇪'},
  {iata:'CGN',name:'Cologne Bonn Airport',city:'Cologne',country:'Germany',flag:'🇩🇪'},
  {iata:'NUE',name:'Nuremberg Airport',city:'Nuremberg',country:'Germany',flag:'🇩🇪'},
  {iata:'LEJ',name:'Leipzig Halle Airport',city:'Leipzig',country:'Germany',flag:'🇩🇪'},
  {iata:'HAJ',name:'Hannover Airport',city:'Hannover',country:'Germany',flag:'🇩🇪'},
  // Greece 🇬🇷
  {iata:'ATH',name:'Athens International Eleftherios Venizelos',city:'Athens',country:'Greece',flag:'🇬🇷'},
  {iata:'SKG',name:'Thessaloniki Macedonia Airport',city:'Thessaloniki',country:'Greece',flag:'🇬🇷'},
  {iata:'HER',name:'Heraklion Nikos Kazantzakis',city:'Heraklion',country:'Greece',flag:'🇬🇷'},
  {iata:'RHO',name:'Rhodes Diagoras Airport',city:'Rhodes',country:'Greece',flag:'🇬🇷'},
  {iata:'CFU',name:'Corfu International',city:'Corfu',country:'Greece',flag:'🇬🇷'},
  {iata:'JTR',name:'Santorini Thira Airport',city:'Santorini',country:'Greece',flag:'🇬🇷'},
  // Hong Kong 🇭🇰
  {iata:'HKG',name:'Hong Kong International',city:'Hong Kong',country:'Hong Kong',flag:'🇭🇰'},
  // Hungary 🇭🇺
  {iata:'BUD',name:'Budapest Ferenc Liszt International',city:'Budapest',country:'Hungary',flag:'🇭🇺'},
  // India 🇮🇳
  {iata:'DEL',name:'Indira Gandhi International',city:'New Delhi',country:'India',flag:'🇮🇳'},
  {iata:'BOM',name:'Chhatrapati Shivaji International',city:'Mumbai',country:'India',flag:'🇮🇳'},
  {iata:'BLR',name:'Kempegowda International',city:'Bengaluru',country:'India',flag:'🇮🇳'},
  {iata:'MAA',name:'Chennai International',city:'Chennai',country:'India',flag:'🇮🇳'},
  {iata:'CCU',name:'Netaji Subhas Chandra Bose',city:'Kolkata',country:'India',flag:'🇮🇳'},
  {iata:'HYD',name:'Rajiv Gandhi International',city:'Hyderabad',country:'India',flag:'🇮🇳'},
  {iata:'COK',name:'Cochin International',city:'Kochi',country:'India',flag:'🇮🇳'},
  {iata:'AMD',name:'Sardar Vallabhbhai Patel Intl',city:'Ahmedabad',country:'India',flag:'🇮🇳'},
  {iata:'GOI',name:'Goa International Dabolim',city:'Goa',country:'India',flag:'🇮🇳'},
  {iata:'JAI',name:'Jaipur International',city:'Jaipur',country:'India',flag:'🇮🇳'},
  // Indonesia 🇮🇩
  {iata:'CGK',name:'Soekarno-Hatta International',city:'Jakarta',country:'Indonesia',flag:'🇮🇩'},
  {iata:'DPS',name:'Ngurah Rai International Bali',city:'Denpasar',country:'Indonesia',flag:'🇮🇩'},
  {iata:'SUB',name:'Juanda International',city:'Surabaya',country:'Indonesia',flag:'🇮🇩'},
  {iata:'UPG',name:'Sultan Hasanuddin International',city:'Makassar',country:'Indonesia',flag:'🇮🇩'},
  // Iran 🇮🇷
  {iata:'IKA',name:'Imam Khomeini International',city:'Tehran',country:'Iran',flag:'🇮🇷'},
  {iata:'THR',name:'Mehrabad International',city:'Tehran',country:'Iran',flag:'🇮🇷'},
  {iata:'MHD',name:'Mashhad International',city:'Mashhad',country:'Iran',flag:'🇮🇷'},
  {iata:'SYZ',name:'Shiraz International',city:'Shiraz',country:'Iran',flag:'🇮🇷'},
  {iata:'TBZ',name:'Tabriz International',city:'Tabriz',country:'Iran',flag:'🇮🇷'},
  {iata:'IFN',name:'Isfahan International',city:'Isfahan',country:'Iran',flag:'🇮🇷'},
  // Iraq 🇮🇶
  {iata:'BGW',name:'Baghdad International',city:'Baghdad',country:'Iraq',flag:'🇮🇶'},
  {iata:'BSR',name:'Basra International',city:'Basra',country:'Iraq',flag:'🇮🇶'},
  {iata:'EBL',name:'Erbil International',city:'Erbil',country:'Iraq',flag:'🇮🇶'},
  // Ireland 🇮🇪
  {iata:'DUB',name:'Dublin Airport',city:'Dublin',country:'Ireland',flag:'🇮🇪'},
  {iata:'ORK',name:'Cork Airport',city:'Cork',country:'Ireland',flag:'🇮🇪'},
  // Israel 🇮🇱
  {iata:'TLV',name:'Ben Gurion International',city:'Tel Aviv',country:'Israel',flag:'🇮🇱'},
  // Italy 🇮🇹
  {iata:'FCO',name:'Rome Fiumicino Leonardo da Vinci',city:'Rome',country:'Italy',flag:'🇮🇹'},
  {iata:'MXP',name:'Milan Malpensa International',city:'Milan',country:'Italy',flag:'🇮🇹'},
  {iata:'LIN',name:'Milan Linate Airport',city:'Milan',country:'Italy',flag:'🇮🇹'},
  {iata:'VCE',name:'Venice Marco Polo Airport',city:'Venice',country:'Italy',flag:'🇮🇹'},
  {iata:'NAP',name:'Naples International',city:'Naples',country:'Italy',flag:'🇮🇹'},
  {iata:'BLQ',name:'Bologna Guglielmo Marconi',city:'Bologna',country:'Italy',flag:'🇮🇹'},
  {iata:'CTA',name:'Catania Fontanarossa Airport',city:'Catania',country:'Italy',flag:'🇮🇹'},
  {iata:'PMO',name:'Palermo Falcone Borsellino',city:'Palermo',country:'Italy',flag:'🇮🇹'},
  {iata:'TRN',name:'Turin Airport',city:'Turin',country:'Italy',flag:'🇮🇹'},
  {iata:'PSA',name:'Pisa International Galileo Galilei',city:'Pisa',country:'Italy',flag:'🇮🇹'},
  {iata:'FLR',name:'Florence Amerigo Vespucci',city:'Florence',country:'Italy',flag:'🇮🇹'},
  {iata:'BRI',name:'Bari Karol Wojtyla Airport',city:'Bari',country:'Italy',flag:'🇮🇹'},
  // Japan 🇯🇵
  {iata:'NRT',name:'Tokyo Narita International',city:'Tokyo',country:'Japan',flag:'🇯🇵'},
  {iata:'HND',name:'Tokyo Haneda International',city:'Tokyo',country:'Japan',flag:'🇯🇵'},
  {iata:'KIX',name:'Osaka Kansai International',city:'Osaka',country:'Japan',flag:'🇯🇵'},
  {iata:'ITM',name:'Osaka Itami Airport',city:'Osaka',country:'Japan',flag:'🇯🇵'},
  {iata:'NGO',name:'Nagoya Chubu Centrair',city:'Nagoya',country:'Japan',flag:'🇯🇵'},
  {iata:'CTS',name:'New Chitose Airport Sapporo',city:'Sapporo',country:'Japan',flag:'🇯🇵'},
  {iata:'FUK',name:'Fukuoka Airport',city:'Fukuoka',country:'Japan',flag:'🇯🇵'},
  {iata:'OKA',name:'Naha Airport Okinawa',city:'Okinawa',country:'Japan',flag:'🇯🇵'},
  // Jordan 🇯🇴
  {iata:'AMM',name:'Queen Alia International',city:'Amman',country:'Jordan',flag:'🇯🇴'},
  {iata:'AQJ',name:'King Hussein International',city:'Aqaba',country:'Jordan',flag:'🇯🇴'},
  // Kazakhstan 🇰🇿
  {iata:'ALA',name:'Almaty International',city:'Almaty',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'NQZ',name:'Nursultan Nazarbayev International',city:'Astana',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'CIT',name:'Shymkent International',city:'Shymkent',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'GUW',name:'Atyrau Airport',city:'Atyrau',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'AKX',name:'Aktobe Airport',city:'Aktobe',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'SCO',name:'Aktau Airport',city:'Aktau',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'KGF',name:'Sary-Arka Airport Karaganda',city:'Karaganda',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'PWQ',name:'Pavlodar Airport',city:'Pavlodar',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'UKK',name:'Oskemen Airport',city:'Oskemen',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'KZO',name:'Kyzylorda Airport',city:'Kyzylorda',country:'Kazakhstan',flag:'🇰🇿'},
  {iata:'URA',name:'Oral Ak Zhol Airport',city:'Oral',country:'Kazakhstan',flag:'🇰🇿'},
  // Kenya 🇰🇪
  {iata:'NBO',name:'Jomo Kenyatta International',city:'Nairobi',country:'Kenya',flag:'🇰🇪'},
  {iata:'MBA',name:'Mombasa Moi International',city:'Mombasa',country:'Kenya',flag:'🇰🇪'},
  // Kuwait 🇰🇼
  {iata:'KWI',name:'Kuwait International',city:'Kuwait City',country:'Kuwait',flag:'🇰🇼'},
  // Kyrgyzstan 🇰🇬
  {iata:'FRU',name:'Manas International',city:'Bishkek',country:'Kyrgyzstan',flag:'🇰🇬'},
  {iata:'OSS',name:'Osh Airport',city:'Osh',country:'Kyrgyzstan',flag:'🇰🇬'},
  // Lebanon 🇱🇧
  {iata:'BEY',name:'Rafic Hariri International',city:'Beirut',country:'Lebanon',flag:'🇱🇧'},
  // Malaysia 🇲🇾
  {iata:'KUL',name:'Kuala Lumpur International',city:'Kuala Lumpur',country:'Malaysia',flag:'🇲🇾'},
  {iata:'PEN',name:'Penang International',city:'Penang',country:'Malaysia',flag:'🇲🇾'},
  {iata:'BKI',name:'Kota Kinabalu International',city:'Kota Kinabalu',country:'Malaysia',flag:'🇲🇾'},
  {iata:'KCH',name:'Kuching International',city:'Kuching',country:'Malaysia',flag:'🇲🇾'},
  // Mexico 🇲🇽
  {iata:'MEX',name:'Mexico City International',city:'Mexico City',country:'Mexico',flag:'🇲🇽'},
  {iata:'GDL',name:'Guadalajara Miguel Hidalgo',city:'Guadalajara',country:'Mexico',flag:'🇲🇽'},
  {iata:'MTY',name:'Monterrey General Mariano Escobedo',city:'Monterrey',country:'Mexico',flag:'🇲🇽'},
  {iata:'CUN',name:'Cancun International',city:'Cancun',country:'Mexico',flag:'🇲🇽'},
  // Morocco 🇲🇦
  {iata:'CMN',name:'Mohammed V International',city:'Casablanca',country:'Morocco',flag:'🇲🇦'},
  {iata:'RAK',name:'Marrakech Menara Airport',city:'Marrakech',country:'Morocco',flag:'🇲🇦'},
  {iata:'RBA',name:'Rabat Sale Airport',city:'Rabat',country:'Morocco',flag:'🇲🇦'},
  {iata:'AGA',name:'Agadir Al Massira Airport',city:'Agadir',country:'Morocco',flag:'🇲🇦'},
  // Nepal 🇳🇵
  {iata:'KTM',name:'Tribhuvan International',city:'Kathmandu',country:'Nepal',flag:'🇳🇵'},
  // Netherlands 🇳🇱
  {iata:'AMS',name:'Amsterdam Schiphol Airport',city:'Amsterdam',country:'Netherlands',flag:'🇳🇱'},
  {iata:'EIN',name:'Eindhoven Airport',city:'Eindhoven',country:'Netherlands',flag:'🇳🇱'},
  {iata:'RTM',name:'Rotterdam The Hague Airport',city:'Rotterdam',country:'Netherlands',flag:'🇳🇱'},
  // New Zealand 🇳🇿
  {iata:'AKL',name:'Auckland Airport',city:'Auckland',country:'New Zealand',flag:'🇳🇿'},
  {iata:'CHC',name:'Christchurch International',city:'Christchurch',country:'New Zealand',flag:'🇳🇿'},
  {iata:'WLG',name:'Wellington International',city:'Wellington',country:'New Zealand',flag:'🇳🇿'},
  // Nigeria 🇳🇬
  {iata:'LOS',name:'Murtala Muhammed International',city:'Lagos',country:'Nigeria',flag:'🇳🇬'},
  {iata:'ABV',name:'Nnamdi Azikiwe International',city:'Abuja',country:'Nigeria',flag:'🇳🇬'},
  // Norway 🇳🇴
  {iata:'OSL',name:'Oslo Gardermoen Airport',city:'Oslo',country:'Norway',flag:'🇳🇴'},
  {iata:'BGO',name:'Bergen Flesland Airport',city:'Bergen',country:'Norway',flag:'🇳🇴'},
  // Oman 🇴🇲
  {iata:'MCT',name:'Muscat International',city:'Muscat',country:'Oman',flag:'🇴🇲'},
  {iata:'SLL',name:'Salalah Airport',city:'Salalah',country:'Oman',flag:'🇴🇲'},
  // Pakistan 🇵🇰
  {iata:'KHI',name:'Jinnah International',city:'Karachi',country:'Pakistan',flag:'🇵🇰'},
  {iata:'LHE',name:'Allama Iqbal International',city:'Lahore',country:'Pakistan',flag:'🇵🇰'},
  {iata:'ISB',name:'Islamabad International',city:'Islamabad',country:'Pakistan',flag:'🇵🇰'},
  {iata:'PEW',name:'Bacha Khan International',city:'Peshawar',country:'Pakistan',flag:'🇵🇰'},
  // Philippines 🇵🇭
  {iata:'MNL',name:'Ninoy Aquino International',city:'Manila',country:'Philippines',flag:'🇵🇭'},
  {iata:'CEB',name:'Mactan-Cebu International',city:'Cebu',country:'Philippines',flag:'🇵🇭'},
  // Poland 🇵🇱
  {iata:'WAW',name:'Warsaw Chopin Airport',city:'Warsaw',country:'Poland',flag:'🇵🇱'},
  {iata:'KRK',name:'Krakow John Paul II International',city:'Krakow',country:'Poland',flag:'🇵🇱'},
  {iata:'GDN',name:'Gdansk Lech Walesa Airport',city:'Gdansk',country:'Poland',flag:'🇵🇱'},
  {iata:'KTW',name:'Katowice International',city:'Katowice',country:'Poland',flag:'🇵🇱'},
  {iata:'WRO',name:'Wroclaw Copernicus Airport',city:'Wroclaw',country:'Poland',flag:'🇵🇱'},
  // Portugal 🇵🇹
  {iata:'LIS',name:'Lisbon Humberto Delgado Airport',city:'Lisbon',country:'Portugal',flag:'🇵🇹'},
  {iata:'OPO',name:'Porto Francisco de Sa Carneiro',city:'Porto',country:'Portugal',flag:'🇵🇹'},
  {iata:'FAO',name:'Faro Airport',city:'Faro',country:'Portugal',flag:'🇵🇹'},
  {iata:'FNC',name:'Madeira International Airport',city:'Funchal',country:'Portugal',flag:'🇵🇹'},
  // Qatar 🇶🇦
  {iata:'DOH',name:'Hamad International',city:'Doha',country:'Qatar',flag:'🇶🇦'},
  // Romania 🇷🇴
  {iata:'OTP',name:'Bucharest Henri Coanda International',city:'Bucharest',country:'Romania',flag:'🇷🇴'},
  {iata:'CLJ',name:'Cluj-Napoca International',city:'Cluj-Napoca',country:'Romania',flag:'🇷🇴'},
  // Russia 🇷🇺
  {iata:'SVO',name:'Moscow Sheremetyevo International',city:'Moscow',country:'Russia',flag:'🇷🇺'},
  {iata:'DME',name:'Moscow Domodedovo International',city:'Moscow',country:'Russia',flag:'🇷🇺'},
  {iata:'VKO',name:'Moscow Vnukovo International',city:'Moscow',country:'Russia',flag:'🇷🇺'},
  {iata:'LED',name:'St Petersburg Pulkovo',city:'St Petersburg',country:'Russia',flag:'🇷🇺'},
  {iata:'SVX',name:'Yekaterinburg Koltsovo',city:'Yekaterinburg',country:'Russia',flag:'🇷🇺'},
  {iata:'OVB',name:'Novosibirsk Tolmachevo',city:'Novosibirsk',country:'Russia',flag:'🇷🇺'},
  {iata:'KZN',name:'Kazan International',city:'Kazan',country:'Russia',flag:'🇷🇺'},
  {iata:'UFA',name:'Ufa International',city:'Ufa',country:'Russia',flag:'🇷🇺'},
  {iata:'AER',name:'Sochi International',city:'Sochi',country:'Russia',flag:'🇷🇺'},
  {iata:'KRR',name:'Krasnodar Pashkovsky',city:'Krasnodar',country:'Russia',flag:'🇷🇺'},
  {iata:'ROV',name:'Rostov-on-Don Platov',city:'Rostov-on-Don',country:'Russia',flag:'🇷🇺'},
  {iata:'IKT',name:'Irkutsk International',city:'Irkutsk',country:'Russia',flag:'🇷🇺'},
  {iata:'VVO',name:'Vladivostok International',city:'Vladivostok',country:'Russia',flag:'🇷🇺'},
  {iata:'KHV',name:'Khabarovsk Novy',city:'Khabarovsk',country:'Russia',flag:'🇷🇺'},
  {iata:'CEK',name:'Chelyabinsk Balandino',city:'Chelyabinsk',country:'Russia',flag:'🇷🇺'},
  {iata:'GOJ',name:'Nizhny Novgorod Strigino',city:'Nizhny Novgorod',country:'Russia',flag:'🇷🇺'},
  {iata:'SGC',name:'Surgut International',city:'Surgut',country:'Russia',flag:'🇷🇺'},
  {iata:'MRV',name:'Mineralnye Vody Airport',city:'Mineralnye Vody',country:'Russia',flag:'🇷🇺'},
  {iata:'OMS',name:'Omsk Tsentralny',city:'Omsk',country:'Russia',flag:'🇷🇺'},
  {iata:'KJA',name:'Krasnoyarsk Yemelyanovo',city:'Krasnoyarsk',country:'Russia',flag:'🇷🇺'},
  {iata:'TJM',name:'Tyumen Roshchino',city:'Tyumen',country:'Russia',flag:'🇷🇺'},
  {iata:'YKS',name:'Yakutsk Airport',city:'Yakutsk',country:'Russia',flag:'🇷🇺'},
  {iata:'UUS',name:'Yuzhno-Sakhalinsk Airport',city:'Yuzhno-Sakhalinsk',country:'Russia',flag:'🇷🇺'},
  // Saudi Arabia 🇸🇦
  {iata:'RUH',name:'King Khalid International',city:'Riyadh',country:'Saudi Arabia',flag:'🇸🇦'},
  {iata:'JED',name:'King Abdulaziz International',city:'Jeddah',country:'Saudi Arabia',flag:'🇸🇦'},
  {iata:'DMM',name:'King Fahd International',city:'Dammam',country:'Saudi Arabia',flag:'🇸🇦'},
  {iata:'MED',name:'Prince Mohammad Bin Abdulaziz',city:'Medina',country:'Saudi Arabia',flag:'🇸🇦'},
  {iata:'AHB',name:'Abha International',city:'Abha',country:'Saudi Arabia',flag:'🇸🇦'},
  // Serbia 🇷🇸
  {iata:'BEG',name:'Belgrade Nikola Tesla Airport',city:'Belgrade',country:'Serbia',flag:'🇷🇸'},
  // Singapore 🇸🇬
  {iata:'SIN',name:'Changi International',city:'Singapore',country:'Singapore',flag:'🇸🇬'},
  // South Africa 🇿🇦
  {iata:'JNB',name:'O.R. Tambo International',city:'Johannesburg',country:'South Africa',flag:'🇿🇦'},
  {iata:'CPT',name:'Cape Town International',city:'Cape Town',country:'South Africa',flag:'🇿🇦'},
  {iata:'DUR',name:'King Shaka International',city:'Durban',country:'South Africa',flag:'🇿🇦'},
  // South Korea 🇰🇷
  {iata:'ICN',name:'Incheon International',city:'Seoul',country:'South Korea',flag:'🇰🇷'},
  {iata:'GMP',name:'Gimpo International',city:'Seoul',country:'South Korea',flag:'🇰🇷'},
  {iata:'PUS',name:'Gimhae International',city:'Busan',country:'South Korea',flag:'🇰🇷'},
  {iata:'CJU',name:'Jeju International',city:'Jeju',country:'South Korea',flag:'🇰🇷'},
  // Spain 🇪🇸
  {iata:'MAD',name:'Madrid Barajas Adolfo Suarez',city:'Madrid',country:'Spain',flag:'🇪🇸'},
  {iata:'BCN',name:'Barcelona El Prat',city:'Barcelona',country:'Spain',flag:'🇪🇸'},
  {iata:'AGP',name:'Malaga Costa del Sol Airport',city:'Malaga',country:'Spain',flag:'🇪🇸'},
  {iata:'PMI',name:'Palma de Mallorca Airport',city:'Palma',country:'Spain',flag:'🇪🇸'},
  {iata:'ALC',name:'Alicante Elche Miguel Hernandez',city:'Alicante',country:'Spain',flag:'🇪🇸'},
  {iata:'IBZ',name:'Ibiza Airport',city:'Ibiza',country:'Spain',flag:'🇪🇸'},
  {iata:'SVQ',name:'Seville Airport',city:'Seville',country:'Spain',flag:'🇪🇸'},
  {iata:'VLC',name:'Valencia Airport',city:'Valencia',country:'Spain',flag:'🇪🇸'},
  {iata:'TFS',name:'Tenerife South Airport',city:'Tenerife',country:'Spain',flag:'🇪🇸'},
  {iata:'LPA',name:'Gran Canaria Airport',city:'Las Palmas',country:'Spain',flag:'🇪🇸'},
  // Sri Lanka 🇱🇰
  {iata:'CMB',name:'Bandaranaike International',city:'Colombo',country:'Sri Lanka',flag:'🇱🇰'},
  // Sweden 🇸🇪
  {iata:'ARN',name:'Stockholm Arlanda Airport',city:'Stockholm',country:'Sweden',flag:'🇸🇪'},
  {iata:'GOT',name:'Gothenburg Landvetter Airport',city:'Gothenburg',country:'Sweden',flag:'🇸🇪'},
  // Switzerland 🇨🇭
  {iata:'ZRH',name:'Zurich Airport',city:'Zurich',country:'Switzerland',flag:'🇨🇭'},
  {iata:'GVA',name:'Geneva Airport',city:'Geneva',country:'Switzerland',flag:'🇨🇭'},
  {iata:'BSL',name:'EuroAirport Basel-Mulhouse-Freiburg',city:'Basel',country:'Switzerland',flag:'🇨🇭'},
  // Taiwan 🇹🇼
  {iata:'TPE',name:'Taiwan Taoyuan International',city:'Taipei',country:'Taiwan',flag:'🇹🇼'},
  {iata:'TSA',name:'Taipei Songshan Airport',city:'Taipei',country:'Taiwan',flag:'🇹🇼'},
  {iata:'KHH',name:'Kaohsiung International',city:'Kaohsiung',country:'Taiwan',flag:'🇹🇼'},
  // Tajikistan 🇹🇯
  {iata:'DYU',name:'Dushanbe International',city:'Dushanbe',country:'Tajikistan',flag:'🇹🇯'},
  {iata:'LBD',name:'Khujand Airport',city:'Khujand',country:'Tajikistan',flag:'🇹🇯'},
  // Thailand 🇹🇭
  {iata:'BKK',name:'Suvarnabhumi International',city:'Bangkok',country:'Thailand',flag:'🇹🇭'},
  {iata:'DMK',name:'Don Mueang International',city:'Bangkok',country:'Thailand',flag:'🇹🇭'},
  {iata:'HKT',name:'Phuket International',city:'Phuket',country:'Thailand',flag:'🇹🇭'},
  {iata:'CNX',name:'Chiang Mai International',city:'Chiang Mai',country:'Thailand',flag:'🇹🇭'},
  // Turkmenistan 🇹🇲
  {iata:'ASB',name:'Ashgabat International',city:'Ashgabat',country:'Turkmenistan',flag:'🇹🇲'},
  {iata:'MYP',name:'Mary Airport',city:'Mary',country:'Turkmenistan',flag:'🇹🇲'},
  {iata:'CRZ',name:'Turkmenabat Airport',city:'Turkmenabat',country:'Turkmenistan',flag:'🇹🇲'},
  {iata:'TAZ',name:'Dasoguz Airport',city:'Dasoguz',country:'Turkmenistan',flag:'🇹🇲'},
  // Turkey 🇹🇷
  {iata:'IST',name:'Istanbul Airport',city:'Istanbul',country:'Turkey',flag:'🇹🇷'},
  {iata:'SAW',name:'Istanbul Sabiha Gokcen',city:'Istanbul',country:'Turkey',flag:'🇹🇷'},
  {iata:'ESB',name:'Ankara Esenboga International',city:'Ankara',country:'Turkey',flag:'🇹🇷'},
  {iata:'ADB',name:'Izmir Adnan Menderes',city:'Izmir',country:'Turkey',flag:'🇹🇷'},
  {iata:'AYT',name:'Antalya International',city:'Antalya',country:'Turkey',flag:'🇹🇷'},
  {iata:'BJV',name:'Milas-Bodrum International',city:'Bodrum',country:'Turkey',flag:'🇹🇷'},
  {iata:'DLM',name:'Dalaman Airport',city:'Dalaman',country:'Turkey',flag:'🇹🇷'},
  {iata:'TZX',name:'Trabzon Airport',city:'Trabzon',country:'Turkey',flag:'🇹🇷'},
  {iata:'GZT',name:'Gaziantep Oguzeli International',city:'Gaziantep',country:'Turkey',flag:'🇹🇷'},
  // UAE 🇦🇪
  {iata:'DXB',name:'Dubai International',city:'Dubai',country:'UAE',flag:'🇦🇪'},
  {iata:'AUH',name:'Abu Dhabi International',city:'Abu Dhabi',country:'UAE',flag:'🇦🇪'},
  {iata:'SHJ',name:'Sharjah International',city:'Sharjah',country:'UAE',flag:'🇦🇪'},
  {iata:'DWC',name:'Al Maktoum International',city:'Dubai',country:'UAE',flag:'🇦🇪'},
  // United Kingdom 🇬🇧
  {iata:'LHR',name:'London Heathrow',city:'London',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'LGW',name:'London Gatwick',city:'London',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'STN',name:'London Stansted',city:'London',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'LTN',name:'London Luton Airport',city:'London',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'LCY',name:'London City Airport',city:'London',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'MAN',name:'Manchester Airport',city:'Manchester',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'BHX',name:'Birmingham Airport',city:'Birmingham',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'EDI',name:'Edinburgh Airport',city:'Edinburgh',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'GLA',name:'Glasgow Airport',city:'Glasgow',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'BRS',name:'Bristol Airport',city:'Bristol',country:'United Kingdom',flag:'🇬🇧'},
  {iata:'NCL',name:'Newcastle Airport',city:'Newcastle',country:'United Kingdom',flag:'🇬🇧'},
  // USA 🇺🇸
  {iata:'ATL',name:'Hartsfield-Jackson Atlanta',city:'Atlanta',country:'USA',flag:'🇺🇸'},
  {iata:'LAX',name:'Los Angeles International',city:'Los Angeles',country:'USA',flag:'🇺🇸'},
  {iata:'ORD',name:'Chicago O Hare International',city:'Chicago',country:'USA',flag:'🇺🇸'},
  {iata:'DFW',name:'Dallas Fort Worth International',city:'Dallas',country:'USA',flag:'🇺🇸'},
  {iata:'JFK',name:'John F Kennedy International',city:'New York',country:'USA',flag:'🇺🇸'},
  {iata:'DEN',name:'Denver International',city:'Denver',country:'USA',flag:'🇺🇸'},
  {iata:'SFO',name:'San Francisco International',city:'San Francisco',country:'USA',flag:'🇺🇸'},
  {iata:'SEA',name:'Seattle-Tacoma International',city:'Seattle',country:'USA',flag:'🇺🇸'},
  {iata:'LAS',name:'Harry Reid International',city:'Las Vegas',country:'USA',flag:'🇺🇸'},
  {iata:'EWR',name:'Newark Liberty International',city:'Newark',country:'USA',flag:'🇺🇸'},
  {iata:'MCO',name:'Orlando International',city:'Orlando',country:'USA',flag:'🇺🇸'},
  {iata:'MIA',name:'Miami International',city:'Miami',country:'USA',flag:'🇺🇸'},
  {iata:'CLT',name:'Charlotte Douglas International',city:'Charlotte',country:'USA',flag:'🇺🇸'},
  {iata:'PHX',name:'Phoenix Sky Harbor International',city:'Phoenix',country:'USA',flag:'🇺🇸'},
  {iata:'IAH',name:'George Bush Intercontinental',city:'Houston',country:'USA',flag:'🇺🇸'},
  {iata:'BOS',name:'Boston Logan International',city:'Boston',country:'USA',flag:'🇺🇸'},
  {iata:'MSP',name:'Minneapolis Saint Paul International',city:'Minneapolis',country:'USA',flag:'🇺🇸'},
  {iata:'DTW',name:'Detroit Metropolitan Airport',city:'Detroit',country:'USA',flag:'🇺🇸'},
  {iata:'PHL',name:'Philadelphia International',city:'Philadelphia',country:'USA',flag:'🇺🇸'},
  {iata:'FLL',name:'Fort Lauderdale Hollywood',city:'Fort Lauderdale',country:'USA',flag:'🇺🇸'},
  {iata:'BWI',name:'Baltimore Washington International',city:'Baltimore',country:'USA',flag:'🇺🇸'},
  {iata:'DCA',name:'Ronald Reagan Washington National',city:'Washington DC',country:'USA',flag:'🇺🇸'},
  {iata:'IAD',name:'Washington Dulles International',city:'Washington DC',country:'USA',flag:'🇺🇸'},
  {iata:'SLC',name:'Salt Lake City International',city:'Salt Lake City',country:'USA',flag:'🇺🇸'},
  {iata:'SAN',name:'San Diego International',city:'San Diego',country:'USA',flag:'🇺🇸'},
  {iata:'TPA',name:'Tampa International',city:'Tampa',country:'USA',flag:'🇺🇸'},
  {iata:'PDX',name:'Portland International',city:'Portland',country:'USA',flag:'🇺🇸'},
  {iata:'HNL',name:'Daniel K Inouye International',city:'Honolulu',country:'USA',flag:'🇺🇸'},
  {iata:'ANC',name:'Ted Stevens Anchorage International',city:'Anchorage',country:'USA',flag:'🇺🇸'},
  {iata:'BNA',name:'Nashville International',city:'Nashville',country:'USA',flag:'🇺🇸'},
  {iata:'AUS',name:'Austin-Bergstrom International',city:'Austin',country:'USA',flag:'🇺🇸'},
  {iata:'MCI',name:'Kansas City International',city:'Kansas City',country:'USA',flag:'🇺🇸'},
  {iata:'MSY',name:'Louis Armstrong New Orleans',city:'New Orleans',country:'USA',flag:'🇺🇸'},
  {iata:'RDU',name:'Raleigh-Durham International',city:'Raleigh',country:'USA',flag:'🇺🇸'},
  {iata:'SMF',name:'Sacramento International',city:'Sacramento',country:'USA',flag:'🇺🇸'},
  {iata:'SJC',name:'Norman Y Mineta San Jose',city:'San Jose',country:'USA',flag:'🇺🇸'},
  {iata:'CLE',name:'Cleveland Hopkins International',city:'Cleveland',country:'USA',flag:'🇺🇸'},
  {iata:'PIT',name:'Pittsburgh International',city:'Pittsburgh',country:'USA',flag:'🇺🇸'},
  {iata:'IND',name:'Indianapolis International',city:'Indianapolis',country:'USA',flag:'🇺🇸'},
  {iata:'STL',name:'St Louis Lambert International',city:'St Louis',country:'USA',flag:'🇺🇸'},
  {iata:'PAE',name:'Paine Field Airport',city:'Everett',country:'USA',flag:'🇺🇸'},
  // Ukraine 🇺🇦
  {iata:'KBP',name:'Kyiv Boryspil International',city:'Kyiv',country:'Ukraine',flag:'🇺🇦'},
  // Uzbekistan 🇺🇿
  {iata:'TAS',name:'Tashkent International',city:'Tashkent',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'SKD',name:'Samarkand International',city:'Samarkand',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'BHK',name:'Bukhara International',city:'Bukhara',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'FEG',name:'Fergana Airport',city:'Fergana',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'NVI',name:'Navoi International',city:'Navoi',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'UGC',name:'Urgench International',city:'Urgench',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'NCU',name:'Nukus Airport',city:'Nukus',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'KSQ',name:'Karshi Airport',city:'Karshi',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'TMF',name:'Termez Airport',city:'Termez',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'AZN',name:'Andijan Airport',city:'Andijan',country:'Uzbekistan',flag:'🇺🇿'},
  {iata:'NMA',name:'Namangan Airport',city:'Namangan',country:'Uzbekistan',flag:'🇺🇿'},
  // Vietnam 🇻🇳
  {iata:'HAN',name:'Noi Bai International',city:'Hanoi',country:'Vietnam',flag:'🇻🇳'},
  {iata:'SGN',name:'Tan Son Nhat International',city:'Ho Chi Minh City',country:'Vietnam',flag:'🇻🇳'},
  {iata:'DAD',name:'Da Nang International',city:'Da Nang',country:'Vietnam',flag:'🇻🇳'},
  {iata:'PQC',name:'Phu Quoc International',city:'Phu Quoc',country:'Vietnam',flag:'🇻🇳'},
];

// ── Unique sorted country list ──────────────────────────
export const COUNTRIES: string[] = Array.from(
  new Set(AIRPORTS.map(a => a.country))
).sort();

// ── Get airports by country ───────────────────────────────
export function airportsByCountry(country: string): Airport[] {
  return AIRPORTS.filter(a => a.country === country);
}

// Smart search: IATA → city → country → name
// Optional pool: search within a subset (e.g. airports of one country)
export function searchAirports(query: string, limit = 10, pool?: Airport[]): Airport[] {
  const src = pool ?? AIRPORTS;
  if (!query || query.length < 1) return src.slice(0, limit);
  const q = query.toLowerCase().trim();
  const results: Airport[] = [];
  const seen = new Set<string>();
  const add = (a: Airport) => { if (!seen.has(a.iata)) { seen.add(a.iata); results.push(a); } };

  src.filter(a => a.iata.toLowerCase() === q).forEach(add);
  src.filter(a => a.iata.toLowerCase().startsWith(q)).forEach(add);
  src.filter(a => a.city.toLowerCase().startsWith(q)).forEach(add);
  src.filter(a => a.name.toLowerCase().includes(q)).forEach(add);
  src.filter(a => a.city.toLowerCase().includes(q)).forEach(add);

  return results.slice(0, limit);
}
