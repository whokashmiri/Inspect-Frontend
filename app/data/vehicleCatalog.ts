export type VehicleCatalogItem = {
  brand: string;
  models: string[];
};

export const vehicleCatalog: VehicleCatalogItem[] = [
{
  brand: "Toyota - تويوتا",
  models: [
    // Sedans
    "Camry - كامري",
    "Corolla - كورولا",
    "Avalon - أفالون",
    "Crown - كراون",
    "Yaris - يارس",
    "Belta - بيلتا",
    "Etios - إتييوس",
    "Premio - بريميو",
    "Allion - أليون",
    "Mark X - مارك X",
    "Celsior - سيلسيور",
    "Century - سنتشري",
    "Mirai - ميراي",
    "Prius - بريوس",
    "Prius Prime - بريوس برايم",

    // Hatchbacks
    "Corolla Hatchback - كورولا هاتشباك",
    "Yaris Hatchback - يارس هاتشباك",
    "Auris - أوريس",
    "Starlet - ستارليت",
    "Passo - باسو",
    "Vitz - فيتز",
    "Matrix - ماتريكس",
    "Blade - بليد",
    "bB - بي بي",
    "iQ - آي كيو",
    "Aygo - أيجو",
    "Agya - أجيا",
    "Wigo - ويجو",

    // SUVs & Crossovers
    "Land Cruiser - لاند كروزر",
    "Land Cruiser Prado - لاند كروزر برادو",
    "RAV4 - راف 4",
    "Highlander - هايلاندر",
    "Grand Highlander - جراند هايلاندر",
    "Fortuner - فورتشنر",
    "4Runner - فور رنر",
    "Sequoia - سيكويا",
    "Corolla Cross - كورولا كروس",
    "C-HR - سي إتش آر",
    "Urban Cruiser - أوربان كروزر",
    "Raize - رايز",
    "Rush - راش",
    "Harrier - هارير",
    "Venza - فينزا",
    "FJ Cruiser - إف جي كروزر",
    "Kluger - كلوجر",
    "bZ4X - بي زد 4 إكس",
    "Crown Signia - كراون سيجنيا",

    // Pickup Trucks
    "Hilux - هايلوكس",
    "Tacoma - تاكوما",
    "Tundra - تندرا",
    "Stout - ستاوت",

    // Vans & MPVs
    "Innova - إنوفا",
    "Innova Hycross - إنوفا هايكروس",
    "Alphard - ألفارد",
    "Vellfire - فيلفاير",
    "HiAce - هايس",
    "Noah - نواه",
    "Voxy - فوكسي",
    "Esquire - إسكواير",
    "Sienta - سيينتا",
    "Avanza - أفانزا",
    "Calya - كاليا",
    "Proace - بروإيس",
    "Granvia - جرانفيا",
    "Previa - بريفيا",
    "Estima - إستيما",

    // Sports Cars
    "GR Supra - جي آر سوبرا",
    "GR86 - جي آر 86",
    "MR2 - إم آر 2",
    "Celica - سيليكا",
    "GT86 - جي تي 86",
    "GR Yaris - جي آر يارس",
    "GR Corolla - جي آر كورولا",

    // Electric & Hybrid
    "bZ3 - بي زد 3",
    "bZ3X - بي زد 3 إكس",
    "bZ5 - بي زد 5",
    "bZ7 - بي زد 7",
    "Prius Plug-in Hybrid - بريوس الهجين القابل للشحن",

    // Commercial
    "Coaster - كوستر",
    "Dyna - داينا",
    "ToyoAce - تويو إيس",
    "LiteAce - لايت إيس",
    "TownAce - تاون إيس",
    "Probox - بروبوكس",
    "Succeed - ساكسيد",

    // Luxury / Special
    "Crown Majesta - كراون ماجيستا",
    "Soarer - سورير",
    "Chaser - تشيسر",
    "Cresta - كريستا",
    "Verossa - فيروسا",
    "Aristo - أريستو",
    "Altezza - ألتيزا",
    "Brevis - بريفيس",
    "Origin - أوريجين",
    "WiLL Vi - ويل في",
    "WiLL VS - ويل في إس",
    "WiLL Cypha - ويل سايفا"
  ]
},
 {
  brand: "Nissan - نيسان",
  models: [
    "Patrol - باترول",
    "Patrol Safari - باترول سفاري",
    "Patrol NISMO - باترول نيسمو",
    "Sunny - صني",
    "Altima - ألتيما",
    "Maxima - ماكسيما",
    "Sentra - سنترا",
    "Versa - فيرسا",
    "Tiida - تيدا",
    "Sylphy - سيلفي",
    "X-Trail - إكس تريل",
    "Kicks - كيكس",
    "Pathfinder - باثفايندر",
    "Murano - مورانو",
    "Terra - تيرا",
    "Armada - أرمادا",
    "Juke - جوك",
    "Qashqai - قشقاي",
    "Navara - نافارا",
    "Frontier - فرونتير",
    "Titan - تايتان",
    "Urvan - أورفان",
    "NV350 - إن في 350",
    "Z - زد",
    "370Z - 370 زد",
    "GT-R - جي تي آر",
    "Leaf - ليف",
    "Ariya - أريا"
  ]
},
 {
  brand: "Hyundai - هيونداي",
  models: [
    // Sedans
    "Accent - أكسنت",
    "Elantra - إلنترا",
    "Sonata - سوناتا",
    "Azera - أزيرا",
    "Grandeur - جرانديور",
    "Verna - فيرنا",
    "Aura - أورا",
    "Xcent - إكسنت",
    "Stellar - ستيلار",

    // Hatchbacks
    "i10 - آي 10",
    "Grand i10 - جراند آي 10",
    "i20 - آي 20",
    "i30 - آي 30",
    "i40 - آي 40",
    "Getz - جيتز",
    "Atos - أتوس",
    "Santro - سانترو",
    "Excel - إكسل",
    "Pony - بوني",
    "Veloster - فيلوستر",

    // SUVs & Crossovers
    "Venue - فينيو",
    "Creta - كريتا",
    "Alcazar - ألكازار",
    "Kona - كونا",
    "Kona Electric - كونا الكهربائية",
    "Tucson - توسان",
    "Santa Fe - سانتا في",
    "Palisade - باليسيد",
    "Terracan - تيراكان",
    "Galloper - جالوبر",
    "Nexo - نيكسو",
    "Bayon - بايون",
    "Casper - كاسبر",
    "Exter - إكستر",
    "ix35 - آي إكس 35",
    "ix55 - آي إكس 55",

    // Electric
    "IONIQ - أيونيك",
    "IONIQ 5 - أيونيك 5",
    "IONIQ 6 - أيونيك 6",
    "IONIQ 9 - أيونيك 9",
    "Inster - إنستر",

    // MPVs & Vans
    "Staria - ستاريا",
    "Staria Lounge - ستاريا لاونج",
    "H-1 - إتش 1",
    "H100 - إتش 100",
    "H350 - إتش 350",
    "Trajet - تراجيت",
    "Matrix - ماتريكس",
    "Lavita - لافيتا",

    // Pickup Trucks
    "Santa Cruz - سانتا كروز",
    "Porter - بورتر",
    "Mighty - مايتي",

    // Sports & Performance
    "Elantra N - إلنترا N",
    "i20 N - آي 20 N",
    "i30 N - آي 30 N",
    "Veloster N - فيلوستر N",

    // Luxury / Genesis-era Models
    "Genesis - جينيسيس",
    "Equus - إكويس",
    "Dynasty - داينستي"
  ]
},
 
{
  brand: "Kia - كيا",
  models: [
    // Sedans
    "K3 - كي 3",
    "Cerato - سيراتو",
    "Forte - فورتي",
    "K4 - كي 4",
    "K5 - كي 5",
    "Optima - أوبتيما",
    "K7 - كي 7",
    "Cadenza - كادينزا",
    "K8 - كي 8",
    "K9 - كي 9",
    "Quoris - كوريس",
    "Pegas - بيجاس",
    "Rio - ريو",

    // Hatchbacks
    "Rio Hatchback - ريو هاتشباك",
    "Picanto - بيكانتو",
    "Ceed - سيد",
    "ProCeed - برو سيد",
    "XCeed - إكس سيد",
    "Ray - راي",
    "Morning - مورنينج",

    // SUVs & Crossovers
    "Sonet - سونيت",
    "Seltos - سيلتوس",
    "Niro - نيرو",
    "Niro Hybrid - نيرو هايبرد",
    "Niro EV - نيرو الكهربائية",
    "Sportage - سبورتاج",
    "Sorento - سورينتو",
    "Telluride - تيلورايد",
    "Stonic - ستونيك",
    "Soul - سول",
    "EV3 - إي في 3",
    "EV5 - إي في 5",
    "EV6 - إي في 6",
    "EV9 - إي في 9",
    "Mohave - موهافي",
    "Borrego - بوريجو",

    // MPVs & Vans
    "Carnival - كرنفال",
    "Carens - كارينز",
    "Rondo - روندو",
    "Sedona - سيدونا",
    "Bongo - بونغو",

    // Pickup Trucks
    "Tasman - تاسمان",

    // Sports / Performance
    "Stinger - ستينجر",

    // Electric
    "EV4 - إي في 4",
    "EV6 GT - إي في 6 جي تي",
    "EV9 GT - إي في 9 جي تي",

    // Commercial
    "K2500 - كي 2500",
    "K2700 - كي 2700",
    "K3000 - كي 3000",
    "K3600 - كي 3600"
  ]
},
{
  brand: "Ford - فورد",
  models: [
    // Sedans
    "Taurus - تورس",
    "Fusion - فيوجن",
    "Focus - فوكس",
    "Fiesta - فييستا",
    "Mondeo - مونديو",
    "Escort - إسكورت",
    "Contour - كونتور",
    "Crown Victoria - كراون فيكتوريا",
    "Five Hundred - فايف هاندرد",
    "Tempo - تيمبو",
    "Fairlane - فيرلين",

    // Hatchbacks
    "Focus Hatchback - فوكس هاتشباك",
    "Fiesta Hatchback - فييستا هاتشباك",
    "Ka - كا",
    "Puma - بوما",

    // SUVs & Crossovers
    "EcoSport - إيكوسبورت",
    "Escape - إسكيب",
    "Kuga - كوجا",
    "Edge - إيدج",
    "Explorer - إكسبلورر",
    "Expedition - إكسبيديشن",
    "Everest - إيفرست",
    "Bronco - برونكو",
    "Bronco Sport - برونكو سبورت",
    "Territory - تريتوري",
    "Flex - فليكس",
    "Excursion - إكسرجن",
    "Endeavour - إنديفور",

    // Pickup Trucks
    "F-150 - إف-150",
    "F-250 - إف-250",
    "F-350 - إف-350",
    "F-450 - إف-450",
    "F-550 - إف-550",
    "Ranger - رينجر",
    "Maverick - مافريك",
    "Super Duty - سوبر ديوتي",
    "Raptor - رابتر",

    // Sports Cars
    "Mustang - موستانج",
    "Mustang Mach-E - موستانج ماك-إي",
    "GT - جي تي",
    "Shelby GT350 - شيلبي GT350",
    "Shelby GT500 - شيلبي GT500",

    // Vans
    "Transit - ترانزيت",
    "Transit Connect - ترانزيت كونيكت",
    "Tourneo Connect - تورنيو كونيكت",
    "Tourneo Custom - تورنيو كاستم",
    "E-Series - إي سيريز",
    "Windstar - ويندستار",
    "Freestar - فريستار",

    // Electric
    "F-150 Lightning - إف-150 لايتنينج",
    "E-Transit - إي ترانزيت",

    // Commercial
    "Courier - كوريير",
    "Transit Chassis - ترانزيت شاسيه",
    "Cargo Van - فان شحن"
  ]
},
 {
  brand: "Chevrolet - شيفروليه",
  models: [
    // Sedans
    "Malibu - ماليبو",
    "Caprice - كابريس",
    "Cruze - كروز",
    "Aveo - أفيو",
    "Sonic - سونيك",
    "Cavalier - كافاليير",
    "Impala - إمبالا",
    "Lumina - لومينا",
    "Optra - أوبترا",
    "Cobalt - كوبالت",
    "Prisma - بريزما",

    // Hatchbacks
    "Spark - سبارك",
    "Spark EV - سبارك الكهربائية",
    "Bolt EV - بولت الكهربائية",
    "Bolt EUV - بولت EUV",

    // SUVs & Crossovers
    "Trailblazer - تريل بليزر",
    "Trax - تراكس",
    "Equinox - إكوينوكس",
    "Blazer - بليزر",
    "Traverse - ترافيرس",
    "Tahoe - تاهو",
    "Suburban - سوبربان",
    "Captiva - كابتيفا",
    "Groove - جروف",
    "Seeker - سيكر",
    "Tracker - تراكر",

    // Pickup Trucks
    "Silverado 1500 - سيلفرادو 1500",
    "Silverado 2500HD - سيلفرادو 2500 HD",
    "Silverado 3500HD - سيلفرادو 3500 HD",
    "Colorado - كولورادو",
    "Montana - مونتانا",
    "S10 - إس 10",
    "Avalanche - أفالانش",

    // Sports Cars
    "Camaro - كامارو",
    "Corvette - كورفيت",

    // Vans
    "Express - إكسبريس",
    "City Express - سيتي إكسبريس",

    // Electric
    "Equinox EV - إكوينوكس الكهربائية",
    "Blazer EV - بليزر الكهربائية",
    "Silverado EV - سيلفرادو الكهربائية",

    // Commercial
    "N-Series - إن سيريز",
    "Low Cab Forward - لو كاب فوروارد"
  ]
},
{
  brand: "GMC - جي إم سي",
  models: [
    // SUVs & Crossovers
    "Terrain - تيرين",
    "Acadia - أكاديا",
    "Yukon - يوكون",
    "Yukon XL - يوكون XL",
    "Jimmy - جيمي",
    "Envoy - إنفوي",
    "Typhoon - تايفون",

    // Pickup Trucks
    "Canyon - كانيون",
    "Sierra 1500 - سييرا 1500",
    "Sierra 2500HD - سييرا 2500 HD",
    "Sierra 3500HD - سييرا 3500 HD",
    "Sierra EV - سييرا الكهربائية",
    "Hummer EV Pickup - هامر الكهربائية بيك أب",

    // Electric SUVs
    "Hummer EV SUV - هامر الكهربائية SUV",

    // Vans
    "Savana Cargo - سافانا شحن",
    "Savana Passenger - سافانا ركاب",

    // Commercial
    "TopKick - توب كيك",
    "Forward - فوروارد",
    "4500HD - 4500 HD",
    "5500HD - 5500 HD",
    "6500HD - 6500 HD"
  ]
},
{
  brand: "Lexus - لكزس",
  models: [
    // Sedans
    "IS - آي إس",
    "ES - إي إس",
    "GS - جي إس",
    "LS - إل إس",

    // Coupes & Convertibles
    "RC - آر سي",
    "LC - إل سي",
    "SC - إس سي",

    // SUVs & Crossovers
    "UX - يو إكس",
    "NX - إن إكس",
    "RX - آر إكس",
    "RZ - آر زد",
    "GX - جي إكس",
    "LX - إل إكس",
    "TX - تي إكس",

    // Performance (F Models)
    "IS F - آي إس F",
    "RC F - آر سي F",
    "GS F - جي إس F",
    "LFA - إل إف إيه",

    // Hybrid Models
    "CT - سي تي",
    "CT 200h - سي تي 200h",
    "UX 250h - يو إكس 250h",
    "NX 350h - إن إكس 350h",
    "NX 450h+ - إن إكس 450h+",
    "RX 350h - آر إكس 350h",
    "RX 450h - آر إكس 450h",
    "RX 500h - آر إكس 500h",
    "ES 300h - إي إس 300h",
    "LS 500h - إل إس 500h",
    "LC 500h - إل سي 500h",

    // Electric
    "RZ 300e - آر زد 300e",
    "RZ 450e - آر زد 450e",
    "RZ 550e F Sport - آر زد 550e إف سبورت"
  ]
},
{
  brand: "Mercedes-Benz - مرسيدس بنز",
  models: [

    "A-Class - الفئة A",
    "C-Class - الفئة C",
    "CLA - سي إل إيه",
    "E-Class - الفئة E",
    "CLS - سي إل إس",
    "S-Class - الفئة S",
    "Maybach S-Class - مايباخ الفئة S",

    // Hatchbacks
    "A-Class Hatchback - الفئة A هاتشباك",
    "B-Class - الفئة B",

    // Coupes & Convertibles
    "CLE - سي إل إي",
    "C-Class Coupe - الفئة C كوبيه",
    "C-Class Cabriolet - الفئة C كابريوليه",
    "E-Class Coupe - الفئة E كوبيه",
    "E-Class Cabriolet - الفئة E كابريوليه",
    "CLS Coupe - سي إل إس كوبيه",
    "SL - إس إل",
    "SLC - إس إل سي",
    "AMG GT - إيه إم جي جي تي",
    "AMG GT 4-Door Coupe - إيه إم جي جي تي كوبيه بأربعة أبواب",

    // SUVs & Crossovers
    "GLA - جي إل إيه",
    "GLB - جي إل بي",
    "GLC - جي إل سي",
    "GLE - جي إل إي",
    "GLS - جي إل إس",
    "G-Class - الفئة G",
    "EQA - إي كيو إيه",
    "EQB - إي كيو بي",
    "EQE SUV - إي كيو إي SUV",
    "EQS SUV - إي كيو إس SUV",
    "Maybach GLS - مايباخ جي إل إس",

    // Electric
    "EQA - إي كيو إيه",
    "EQB - إي كيو بي",
    "EQE - إي كيو إي",
    "EQS - إي كيو إس",
    "EQE SUV - إي كيو إي SUV",
    "EQS SUV - إي كيو إس SUV",

    // Performance (AMG)
    "A 35 AMG - A 35 إيه إم جي",
    "A 45 AMG - A 45 إيه إم جي",
    "C 43 AMG - C 43 إيه إم جي",
    "C 63 AMG - C 63 إيه إم جي",
    "E 53 AMG - E 53 إيه إم جي",
    "E 63 AMG - E 63 إيه إم جي",
    "S 63 AMG - S 63 إيه إم جي",
    "S 65 AMG - S 65 إيه إم جي",
    "GLA 45 AMG - GLA 45 إيه إم جي",
    "GLB 35 AMG - GLB 35 إيه إم جي",
    "GLC 43 AMG - GLC 43 إيه إم جي",
    "GLC 63 AMG - GLC 63 إيه إم جي",
    "GLE 53 AMG - GLE 53 إيه إم جي",
    "GLE 63 AMG - GLE 63 إيه إم جي",
    "G 63 AMG - G 63 إيه إم جي",
    "SL 63 AMG - SL 63 إيه إم جي",

    // Vans & Commercial
    "Sprinter - سبرينتر",
    "V-Class - الفئة V",
    "Vito - فيتو",
    "Citan - سيتان",
    "eSprinter - إي سبرينتر"
  ]
},
{
  brand: "BMW - بي إم دبليو",
  models: [
    // Sedans
    "1 Series - الفئة الأولى",
    "2 Series Gran Coupe - الفئة الثانية جران كوبيه",
    "3 Series - الفئة الثالثة",
    "4 Series Gran Coupe - الفئة الرابعة جران كوبيه",
    "5 Series - الفئة الخامسة",
    "6 Series Gran Turismo - الفئة السادسة جران توريزمو",
    "7 Series - الفئة السابعة",
    "8 Series Gran Coupe - الفئة الثامنة جران كوبيه",

    // Coupes & Convertibles
    "2 Series Coupe - الفئة الثانية كوبيه",
    "2 Series Convertible - الفئة الثانية كشف",
    "4 Series Coupe - الفئة الرابعة كوبيه",
    "4 Series Convertible - الفئة الرابعة كشف",
    "8 Series Coupe - الفئة الثامنة كوبيه",
    "8 Series Convertible - الفئة الثامنة كشف",
    "Z4 - زد 4",

    // SUVs & Crossovers
    "X1 - إكس 1",
    "X2 - إكس 2",
    "X3 - إكس 3",
    "X4 - إكس 4",
    "X5 - إكس 5",
    "X6 - إكس 6",
    "X7 - إكس 7",
    "XM - إكس إم",

    // Electric
    "i3 - آي 3",
    "i4 - آي 4",
    "i5 - آي 5",
    "i7 - آي 7",
    "iX - آي إكس",
    "iX1 - آي إكس 1",
    "iX2 - آي إكس 2",
    "iX3 - آي إكس 3",

    // Performance (M Models)
    "M2 - إم 2",
    "M3 - إم 3",
    "M4 - إم 4",
    "M5 - إم 5",
    "M8 - إم 8",
    "X3 M - إكس 3 إم",
    "X4 M - إكس 4 إم",
    "X5 M - إكس 5 إم",
    "X6 M - إكس 6 إم",
    "XM Label - إكس إم ليبل",

    // Hybrids
    "330e - 330e",
    "530e - 530e",
    "750e - 750e",
    "X3 xDrive30e - إكس 3 xDrive30e",
    "X5 xDrive50e - إكس 5 xDrive50e",

    // Classic / Discontinued
    "Z3 - زد 3",
    "Z8 - زد 8",
    "6 Series Coupe - الفئة السادسة كوبيه",
    "6 Series Convertible - الفئة السادسة كشف",
    "ActiveHybrid 3 - أكتيف هايبرد 3",
    "ActiveHybrid 5 - أكتيف هايبرد 5",
    "ActiveHybrid 7 - أكتيف هايبرد 7"
  ]
},


{
  brand: "Honda - هوندا",
  models: [
    // Sedans
    "Accord - أكورد",
    "Civic - سيفيك",
    "City - سيتي",
    "Amaze - أماز",
    "Insight - إنسايت",
    "Legend - ليجند",

    // Hatchbacks
    "Jazz - جاز",
    "Fit - فيت",
    "Brio - بريو",
    "e - إي",

    // SUVs & Crossovers
    "HR-V - إتش آر-في",
    "ZR-V - زد آر-في",
    "CR-V - سي آر-في",
    "Passport - باسبورت",
    "Pilot - بايلوت",
    "BR-V - بي آر-في",
    "WR-V - دبليو آر-في",
    "Elevate - إليفيت",
    "Prologue - برولوج",

    // Minivans & MPVs
    "Odyssey - أوديسي",
    "Stepwgn - ستيب واجن",
    "Freed - فريد",
    "Mobilio - موبيليو",

    // Pickup Trucks
    "Ridgeline - ريدجلاين",

    // Sports Cars
    "Civic Type R - سيفيك تايب آر",
    "Integra - إنتيجرا",
    "NSX - إن إس إكس",
    "S2000 - إس 2000",
    "Prelude - بريلود",
    "CR-Z - سي آر-زد",

    // Electric & Hybrid
    "e:Ny1 - إي:إن واي 1",
    "Accord Hybrid - أكورد هايبرد",
    "Civic Hybrid - سيفيك هايبرد",
    "CR-V Hybrid - سي آر-في هايبرد",
    "Insight Hybrid - إنسايت هايبرد"
  ]
},


{
  brand: "Mazda - مازدا",
  models: [
    "Mazda 3 - مازدا 3",
    "Mazda 6 - مازدا 6",
    "CX-3 - سي إكس-3",
    "CX-5 - سي إكس-5",
    "CX-9 - سي إكس-9",
    "BT-50 - بي تي-50"
  ]
},

{
  brand: "Mitsubishi - ميتسوبيشي",
  models: [
    // Sedans
    "Attrage - أتراج",
    "Lancer - لانسر",
    "Lancer EX - لانسر EX",
    "Galant - جالانت",
    "Mirage G4 - ميراج G4",
    "Diamante - ديامانتي",
    "Eterna - إيتيرنا",
    "Sigma - سيجما",

    // Hatchbacks
    "Mirage - ميراج",
    "Colt - كولت",

    // SUVs & Crossovers
    "ASX - إيه إس إكس",
    "Eclipse Cross - إكليبس كروس",
    "Outlander - أوتلاندر",
    "Outlander PHEV - أوتلاندر PHEV",
    "Pajero - باجيرو",
    "Pajero Sport - باجيرو سبورت",
    "Montero - مونتيرو",
    "Montero Sport - مونتيرو سبورت",
    "Xpander - إكسباندر",
    "Xpander Cross - إكسباندر كروس",
    "Airtrek - إيرتريك",
    "Endeavor - إنديفور",

    // Pickup Trucks
    "L200 - إل 200",
    "Triton - تريتون",
    "Strada - سترادا",
    "Mighty Max - مايتي ماكس",

    // Vans & MPVs
    "Delica - ديليكا",
    "Express - إكسبريس",

    // Electric & Hybrid
    "i-MiEV - آي ميف",
    "Minicab MiEV - ميني كاب ميف",
    "Outlander PHEV - أوتلاندر PHEV",

    // Sports Cars
    "Lancer Evolution - لانسر إيفولوشن",
    "3000GT - 3000 جي تي",
    "Eclipse - إكليبس",
    "Starion - ستاريون",
    "FTO - إف تي أو",
    "GTO - جي تي أو"
  ]
},
{
  brand: "Isuzu - ايسوزو",
  models: [
    // Pickup Trucks
    "D-Max - دي ماكس",
    "KB - كي بي",
    "TF - تي إف",
    "Faster - فاستر",

    // SUVs
    "MU-X - إم يو-إكس",
    "mu-7 - إم يو-7",
    "VehiCROSS - فيهي كروس",
    "Trooper - تروبر",
    "Bighorn - بيغهورن",
    "Wizard - ويزارد",
    "Rodeo - روديو",
    "Axiom - أكسيوم",
    "Amigo - أميجو",

    // Light Commercial
    "Traga - تراجا",
    "Panther - بانثر",

    // Vans
    "Traviz - ترافيز",

    // N-Series (Light Duty Trucks)
    "NLR - إن إل آر",
    "NMR - إن إم آر",
    "NNR - إن إن آر",
    "NPR - إن بي آر",
    "NQR - إن كيو آر",
    "NRR - إن آر آر",
    "N-Series - سلسلة N",

    // F-Series (Medium Duty Trucks)
    "FRR - إف آر آر",
    "FSR - إف إس آر",
    "FTR - إف تي آر",
    "FVR - إف في آر",
    "FVM - إف في إم",
    "FXZ - إف إكس زد",
    "F-Series - سلسلة F",

    // C & E Series
    "C-Series - سلسلة C",
    "CYZ - سي واي زد",
    "CXZ - سي إكس زد",
    "EXR - إي إكس آر",
    "EXZ - إي إكس زد",

    // Heavy Duty
    "Giga - جيجا",

    // Buses
    "Journey - جورني",
    "Erga - إرجا",
    "Gala - جالا"
  ]
},

{
  brand: "Maybach - مايباخ",
  models: [
    "57 - 57",
    "57 S - 57 S",
    "57 SWB - 57 SWB",
    "62 - 62",
    "62 S - 62 S",
    "Landaulet - لاندوليه",
    "Exelero - إكسيليرو",
    "S-Class - الفئة S",
    "GLS - جي إل إس",
    "EQS SUV - إي كيو إس SUV"
  ]
},
{
  brand: "MINI - ميني",
  models: [
    "3 Door - 3 أبواب",
    "5 Door - 5 أبواب",
    "Convertible - كشف",
    "Clubman - كلوبمان",
    "Countryman - كنتريمان",
    "Paceman - بيسمان",
    "Coupe - كوبيه",
    "Roadster - رودستر",
    "John Cooper Works - جون كوبر ووركس",
    "Electric - الكهربائية",
    "Aceman - إيسمان"
  ]
},
{
  brand: "Audi - أودي",
  models: [
    // Sedans
    "A1 - A1",
    "A3 - A3",
    "A4 - A4",
    "A5 - A5",
    "A6 - A6",
    "A7 - A7",
    "A8 - A8",

    // Wagons
    "A4 Avant - A4 أفانت",
    "A6 Avant - A6 أفانت",
    "RS4 Avant - RS4 أفانت",
    "RS6 Avant - RS6 أفانت",

    // SUVs & Crossovers
    "Q2 - Q2",
    "Q3 - Q3",
    "Q4 e-tron - Q4 إي-ترون",
    "Q5 - Q5",
    "Q6 e-tron - Q6 إي-ترون",
    "Q7 - Q7",
    "Q8 - Q8",
    "Q8 e-tron - Q8 إي-ترون",

    // Sports Cars
    "TT - تي تي",
    "R8 - آر 8",

    // Electric
    "e-tron GT - إي-ترون GT",
    "Q4 Sportback e-tron - Q4 سبورتباك إي-ترون",
    "Q8 Sportback e-tron - Q8 سبورتباك إي-ترون",

    // Performance
    "S3 - S3",
    "S4 - S4",
    "S5 - S5",
    "S6 - S6",
    "S7 - S7",
    "S8 - S8",
    "SQ5 - SQ5",
    "SQ7 - SQ7",
    "SQ8 - SQ8",
    "RS3 - RS3",
    "RS4 - RS4",
    "RS5 - RS5",
    "RS6 - RS6",
    "RS7 - RS7",
    "RS Q3 - RS Q3",
    "RS Q8 - RS Q8"
  ]
},
{
  brand: "Volkswagen - فولكس فاجن",
  models: [
    // Hatchbacks
    "Polo - بولو",
    "Golf - جولف",
    "up! - أب!",
    "ID.3 - آي دي 3",

    // Sedans
    "Virtus - فيرتوس",
    "Jetta - جيتا",
    "Passat - باسات",
    "Arteon - أرتيون",

    // SUVs
    "T-Cross - تي كروس",
    "Taigo - تايجو",
    "Taos - تاوس",
    "Tiguan - تيجوان",
    "Tiguan Allspace - تيجوان أول سبيس",
    "Teramont - تيرامونت",
    "Touareg - طوارق",
    "ID.4 - آي دي 4",
    "ID.5 - آي دي 5",
    "ID.6 - آي دي 6",

    // Vans
    "Caddy - كادي",
    "Transporter - ترانسبورتر",
    "Caravelle - كارافيل",
    "Multivan - مولتيفان",
    "Crafter - كرافتر",

    // Pickup
    "Amarok - أماروك",

    // Performance
    "Golf GTI - جولف GTI",
    "Golf R - جولف R"
  ]
},
{
  brand: "Porsche - بورش",
  models: [
    "718 Boxster - 718 بوكستر",
    "718 Cayman - 718 كايمان",
    "911 - 911",
    "Panamera - باناميرا",
    "Macan - ماكان",
    "Cayenne - كايين",
    "Taycan - تايكان",
    "Cayenne Coupe - كايين كوبيه",
    "Macan Electric - ماكان الكهربائية",
    "918 Spyder - 918 سبايدر",
    "Carrera GT - كاريرا GT"
  ]
},
{
  brand: "Opel - أوبل",
  models: [
    // Hatchbacks
    "Corsa - كورسا",
    "Astra - أسترا",
    "Adam - آدم",
    "Karl - كارل",

    // Sedans
    "Insignia - إنسيجنيا",
    "Vectra - فيكترا",
    "Omega - أوميجا",

    // SUVs & Crossovers
    "Mokka - موكا",
    "Grandland - جراندلاند",
    "Crossland - كروسلاند",
    "Frontera - فرونتيرا",
    "Antara - أنتارا",

    // MPVs
    "Meriva - ميريفا",
    "Zafira - زافيرا",
    "Combo - كومبو",

    // Vans
    "Vivaro - فيفارو",
    "Movano - موفانو",

    // Electric
    "Corsa Electric - كورسا الكهربائية",
    "Mokka Electric - موكا الكهربائية",
    "Astra Electric - أسترا الكهربائية",
    "Combo Electric - كومبو الكهربائية",
    "Vivaro Electric - فيفارو الكهربائية"
  ]
},


{
  brand: "Land Rover - لاند روفر",
  models: [
    "Defender 90 - ديفندر 90",
    "Defender 110 - ديفندر 110",
    "Defender 130 - ديفندر 130",
    "Discovery - ديسكفري",
    "Discovery Sport - ديسكفري سبورت",
    "Freelander - فريلاندر",
    "LR2 - إل آر 2",
    "LR3 - إل آر 3",
    "LR4 - إل آر 4",
    "Series I - سيريز I",
    "Series II - سيريز II",
    "Series III - سيريز III"
  ]
},
{
  brand: "Range Rover - رينج روفر",
  models: [
    "Range Rover - رينج روفر",
    "Range Rover Sport - رينج روفر سبورت",
    "Range Rover Velar - رينج روفر فيلار",
    "Range Rover Evoque - رينج روفر إيفوك",
    "Range Rover SV - رينج روفر SV",
    "Range Rover SVAutobiography - رينج روفر SV أوتوبيوجرافي",
    "Range Rover Autobiography - رينج روفر أوتوبيوجرافي"
  ]
},
{
  brand: "Jaguar - جاكوار",
  models: [
    // Sedans
    "XE - إكس إي",
    "XF - إكس إف",
    "XJ - إكس جي",

    // SUVs
    "E-PACE - إي-بيس",
    "F-PACE - إف-بيس",
    "I-PACE - آي-بيس",

    // Sports Cars
    "F-Type - إف-تايب",
    "XK - إكس كيه",
    "XKR - إكس كيه آر",

    // Classic
    "S-Type - إس-تايب",
    "X-Type - إكس-تايب",
    "XJS - إكس جي إس",
    "E-Type - إي-تايب",
    "Mark II - مارك II"
  ]
},
{
  brand: "Bentley - بنتلي",
  models: [
    "Bentayga - بنتايجا",
    "Continental GT - كونتيننتال GT",
    "Continental GTC - كونتيننتال GTC",
    "Flying Spur - فلاينج سبير",
    "Mulsanne - مولسان",
    "Arnage - أرناج",
    "Azure - أزور",
    "Brooklands - بروكلاندز",
    "Turbo R - تيربو R",
    "Bacalar - باكالار",
    "Batur - باتور"
  ]
},
{
  brand: "Rolls-Royce - رولز رويس",
  models: [
    "Phantom - فانتوم",
    "Ghost - جوست",
    "Ghost Extended - جوست إكستندد",
    "Wraith - رايث",
    "Dawn - داون",
    "Cullinan - كولينان",
    "Spectre - سبيكتر",
    "Silver Spirit - سيلفر سبيريت",
    "Silver Spur - سيلفر سبير",
    "Silver Shadow - سيلفر شادو",
    "Corniche - كورنيش",
    "Camargue - كامارغ"
  ]
},
{
  brand: "Aston Martin - أستون مارتن",
  models: [
    "Vantage - فانتاج",
    "DB11 - دي بي 11",
    "DB12 - دي بي 12",
    "DBS - دي بي إس",
    "DBX - دي بي إكس",
    "Vanquish - فانكويش",
    "Rapide - رابيد",
    "Virage - فيراج",
    "Valhalla - فالهالا",
    "Valkyrie - فالكيري",
    "Victor - فيكتور",
    "One-77 - ون-77",
    "Cygnet - سيجنت"
  ]
},
{
  brand: "McLaren - ماكلارين",
  models: [
    "540C - 540 سي",
    "570S - 570 إس",
    "570GT - 570 جي تي",
    "600LT - 600 إل تي",
    "620R - 620 آر",
    "650S - 650 إس",
    "675LT - 675 إل تي",
    "720S - 720 إس",
    "750S - 750 إس",
    "765LT - 765 إل تي",
    "Artura - أرتورا",
    "GT - جي تي",
    "GTS - جي تي إس",
    "P1 - بي 1",
    "Senna - سينا",
    "Speedtail - سبيدتيل",
    "Elva - إلفا",
    "Sabre - سابر",
    "Solus GT - سولوس جي تي"
  ]
},
{
  brand: "Lotus - لوتس",
  models: [
    "Emira - إميرا",
    "Emeya - إيميا",
    "Eletre - إليترا",
    "Evija - إيفيجا",
    "Evora - إيفورا",
    "Elise - إليز",
    "Exige - إكسيج",
    "Europa - يوروبا",
    "Esprit - إسبريت",
    "Elite - إيليت",
    "Elan - إيلان",
    "Seven - سيفن"
  ]
},



{
  brand: "MG - إم جي",
  models: [
    // Sedans
    "MG3 - إم جي 3",
    "MG5 - إم جي 5",
    "MG6 - إم جي 6",
    "MG7 - إم جي 7",
    "MG GT - إم جي GT",

    // SUVs
    "ZS - زد إس",
    "ZS EV - زد إس الكهربائية",
    "HS - إتش إس",
    "RX5 - آر إكس 5",
    "RX8 - آر إكس 8",
    "One - ون",
    "Marvel R - مارفل R",

    // Electric
    "MG4 Electric - إم جي 4 الكهربائية",
    "Cyberster - سايبرستر",

    // Sports / Classic
    "MGF - إم جي إف",
    "TF - تي إف",
    "MGB - إم جي بي",
    "MGA - إم جي إيه",
    "MGC - إم جي سي",
    "Midget - ميدجيت"
  ]
},
{
  brand: "Ferrari - فيراري",
  models: [
    "296 GTB - 296 GTB",
    "296 GTS - 296 GTS",
    "12Cilindri - 12 تشيليندري",
    "12Cilindri Spider - 12 تشيليندري سبايدر",
    "Roma - روما",
    "Roma Spider - روما سبايدر",
    "Portofino - بورتوفينو",
    "California - كاليفورنيا",
    "SF90 Stradale - SF90 سترادالي",
    "SF90 Spider - SF90 سبايدر",
    "F8 Tributo - F8 تريبوتو",
    "F8 Spider - F8 سبايدر",
    "488 GTB - 488 GTB",
    "488 Spider - 488 سبايدر",
    "488 Pista - 488 بيستا",
    "458 Italia - 458 إيطاليا",
    "458 Spider - 458 سبايدر",
    "458 Speciale - 458 سبيشيالي",
    "430 Scuderia - 430 سكوديريا",
    "F430 - F430",
    "360 Modena - 360 مودينا",
    "360 Spider - 360 سبايدر",
    "355 - 355",
    "550 Maranello - 550 مارانيلو",
    "575M Maranello - 575M مارانيلو",
    "599 GTB Fiorano - 599 GTB فيورانو",
    "612 Scaglietti - 612 سكالييتي",
    "FF - إف إف",
    "GTC4Lusso - GTC4 لوسو",
    "812 Superfast - 812 سوبرفاست",
    "812 GTS - 812 GTS",
    "Purosangue - بروسانجوي",
    "LaFerrari - لافيراري",
    "Enzo - إنزو",
    "F40 - F40",
    "F50 - F50",
    "288 GTO - 288 GTO",
    "Testarossa - تيستاروسا",
    "F12 Berlinetta - F12 برلينيتا"
  ]
},
{
  brand: "Lamborghini - لامبورغيني",
  models: [
    "Huracan - هوراكان",
    "Huracan EVO - هوراكان EVO",
    "Huracan STO - هوراكان STO",
    "Huracan Tecnica - هوراكان تكنيكا",
    "Huracan Sterrato - هوراكان ستيراتو",
    "Temerario - تيميراريو",
    "Revuelto - ريفويلتو",
    "Aventador - أفينتادور",
    "Murcielago - مورسيلاجو",
    "Gallardo - جالاردو",
    "Diablo - ديابلو",
    "Countach - كونتاش",
    "Miura - ميورا",
    "Urus - أوروس",
    "Urus Performante - أوروس بيرفورمانتي",
    "Urus SE - أوروس SE",
    "LM002 - إل إم 002",
    "Sian - سيان",
    "Centenario - سنتيناريو",
    "Reventon - ريفينتون",
    "Veneno - فينينو",
    "Essenza SCV12 - إيسينزا SCV12"
  ]
},



{
  brand: "Maserati - مازيراتي",
  models: [
    "Ghibli - جيبلي",
    "Quattroporte - كواتروبورتي",
    "Levante - ليفانتي",
    "Grecale - جريكالي",
    "GranTurismo - جران توريزمو",
    "GranCabrio - جران كابريو",
    "MC20 - إم سي 20",
    "MC20 Cielo - إم سي 20 تشيلو",
    "GranSport - جران سبورت",
    "GranTurismo Folgore - جران توريزمو فولجوري",
    "Grecale Folgore - جريكالي فولجوري",
    "Spyder - سبايدر",
    "Coupe - كوبيه",
    "3200 GT - 3200 جي تي",
    "Biturbo - بيتوربو"
  ]
},
{
  brand: "Alfa Romeo - ألفا روميو",
  models: [
    "Giulia - جوليا",
    "Stelvio - ستيلفيو",
    "Tonale - تونالي",
    "Junior - جونيور",
    "Giulietta - جولييتا",
    "MiTo - ميتو",
    "159 - 159",
    "156 - 156",
    "147 - 147",
    "166 - 166",
    "Brera - بريرا",
    "Spider - سبايدر",
    "4C - 4C",
    "8C Competizione - 8C كومبيتيزيوني",
    "GT - جي تي",
    "GTV - جي تي في"
  ]
},
{
  brand: "Fiat - فيات",
  models: [
    "500 - 500",
    "500e - 500e",
    "500X - 500X",
    "500L - 500L",
    "Panda - باندا",
    "Tipo - تيبو",
    "Punto - بونتو",
    "Linea - لينيا",
    "Bravo - برافو",
    "Doblo - دوبلو",
    "Fiorino - فيورينو",
    "Scudo - سكودو",
    "Ducato - دوكاتو",
    "Uno - أونو",
    "Palio - باليو",
    "Siena - سيينا",
    "Mobi - موبي",
    "Pulse - بالس",
    "Fastback - فاستباك",
    "Strada - سترادا",
    "Toro - تورو"
  ]
},
{
  brand: "Abarth - أبارث",
  models: [
    "500 - 500",
    "595 - 595",
    "695 - 695",
    "124 Spider - 124 سبايدر",
    "Pulse - بالس",
    "Fastback - فاستباك",
    "600e - 600e"
  ]
},
{
  brand: "Pagani - باجاني",
  models: [
    "Zonda - زوندا",
    "Zonda C12 - زوندا C12",
    "Zonda F - زوندا F",
    "Zonda Cinque - زوندا تشينكوي",
    "Zonda R - زوندا R",
    "Huayra - هوايرا",
    "Huayra BC - هوايرا BC",
    "Huayra Roadster - هوايرا رودستر",
    "Huayra R - هوايرا R",
    "Utopia - يوتوبيا",
    "Utopia Roadster - يوتوبيا رودستر"
  ]
},


{
  brand: "Infiniti - إنفينيتي",
  models: [
    // Sedans
    "Q50 - كيو 50",
    "Q60 - كيو 60",
    "Q70 - كيو 70",
    "G25 - جي 25",
    "G35 - جي 35",
    "G37 - جي 37",
    "M35 - إم 35",
    "M37 - إم 37",
    "M45 - إم 45",
    "M56 - إم 56",
    "Q45 - كيو 45",

    // SUVs & Crossovers
    "QX30 - كيو إكس 30",
    "QX50 - كيو إكس 50",
    "QX55 - كيو إكس 55",
    "QX60 - كيو إكس 60",
    "QX70 - كيو إكس 70",
    "QX80 - كيو إكس 80",
    "EX35 - إي إكس 35",
    "EX37 - إي إكس 37",
    "FX35 - إف إكس 35",
    "FX37 - إف إكس 37",
    "FX45 - إف إكس 45",
    "FX50 - إف إكس 50",
    "JX35 - جي إكس 35",

    // Coupes & Convertibles
    "G37 Coupe - جي 37 كوبيه",
    "Q60 Coupe - كيو 60 كوبيه"
  ]
},
{
  brand: "Lincoln - لينكون",
  models: [
    // Sedans
    "MKZ - إم كيه زد",
    "Continental - كونتيننتال",
    "LS - إل إس",
    "Town Car - تاون كار",

    // SUVs & Crossovers
    "Corsair - كورسير",
    "Nautilus - نوتيلوس",
    "Aviator - أفياتور",
    "Navigator - نافيجيتور",
    "MKC - إم كيه سي",
    "MKX - إم كيه إكس",
    "MKT - إم كيه تي",
    "MKS - إم كيه إس",

    // Classic
    "Mark LT - مارك LT",
    "Blackwood - بلاكوود"
  ]
},
{
  brand: "Cadillac - كاديلاك",
  models: [
    // Sedans
    "CT4 - سي تي 4",
    "CT5 - سي تي 5",
    "CT6 - سي تي 6",
    "ATS - إيه تي إس",
    "CTS - سي تي إس",
    "XTS - إكس تي إس",

    // SUVs & Crossovers
    "XT4 - إكس تي 4",
    "XT5 - إكس تي 5",
    "XT6 - إكس تي 6",
    "Escalade - إسكاليد",
    "Escalade ESV - إسكاليد ESV",
    "SRX - إس آر إكس",

    // Electric
    "Lyriq - ليريك",
    "Celestiq - سيليستيك",
    "Escalade IQ - إسكاليد IQ",
    "Optiq - أوبتيك",
    "Vistiq - فيستيك",

    // Performance
    "CT4-V - سي تي 4-V",
    "CT5-V - سي تي 5-V",
    "CTS-V - سي تي إس-V",
    "Blackwing - بلاك وينج"
  ]
},
{
  brand: "Buick - بويك",
  models: [
    // Sedans
    "LaCrosse - لاكروس",
    "Regal - ريجال",
    "Verano - فيرانو",
    "Excelle - إكسيل",

    // SUVs & Crossovers
    "Encore - إنكور",
    "Encore GX - إنكور GX",
    "Envision - إنفيجن",
    "Enclave - إنكليف",
    "Envista - إنفيستا",

    // Wagons
    "Regal TourX - ريجال TourX",

    // Classic
    "Park Avenue - بارك أفينيو",
    "Century - سنتشري",
    "LeSabre - لو سابر",
    "Riviera - ريفييرا"
  ]
},
{
  brand: "Jeep - جيب",
  models: [
    "Wrangler - رانجلر",
    "Grand Cherokee - جراند شيروكي",
    "Cherokee - شيروكي",
    "Compass - كومباس",
    "Renegade - رينيجيد",
    "Gladiator - جلادياتور",
    "Wagoneer - واجونير",
    "Grand Wagoneer - جراند واجونير",
    "Commander - كوماندر",
    "Patriot - باتريوت",
    "Liberty - ليبرتي",
    "Avenger - أفينجر"
  ]
},




{
  brand: "Dodge - دودج",
  models: [
    // Sedans
    "Charger - تشارجر",
    "Dart - دارت",

    // Coupes
    "Challenger - تشالنجر",
    "Viper - فايبر",

    // SUVs
    "Durango - دورانجو",
    "Journey - جورني",
    "Nitro - نيترو",
    "Hornet - هورنيت",

    // Vans
    "Grand Caravan - جراند كارافان",

    // Classic
    "Magnum - ماجنوم",
    "Neon - نيون",
    "Avenger - أفينجر",
    "Caliber - كاليبر"
  ]
},
{
  brand: "RAM - رام",
  models: [
    "1500 - 1500",
    "1500 Classic - 1500 كلاسيك",
    "2500 - 2500",
    "3500 - 3500",
    "4500 - 4500",
    "5500 - 5500",
    "ProMaster - بروماستر",
    "ProMaster City - بروماستر سيتي",
    "Dakota - داكوتا",
    "Rampage - رامبيج"
  ]
},
{
  brand: "Chrysler - كرايسلر",
  models: [
    "300 - 300",
    "200 - 200",
    "Pacifica - باسيفيكا",
    "Voyager - فوييجر",
    "Town & Country - تاون آند كانتري",
    "Aspen - أسبن",
    "Crossfire - كروسفاير",
    "PT Cruiser - بي تي كروزر",
    "Sebring - سيبرينج",
    "Concorde - كونكورد",
    "LHS - إل إتش إس",
    "New Yorker - نيويوركر"
  ]
},
{
  brand: "Tesla - تسلا",
  models: [
    "Model S - موديل S",
    "Model 3 - موديل 3",
    "Model X - موديل X",
    "Model Y - موديل Y",
    "Cybertruck - سايبرتراك",
    "Roadster - رودستر",
    "Semi - سيمي"
  ]
},
{
  brand: "Rivian - ريفيان",
  models: [
    "R1T - آر 1 تي",
    "R1S - آر 1 إس",
    "R2 - آر 2",
    "R3 - آر 3",
    "R3X - آر 3 إكس",
    "EDV - إي دي في"
  ]
},


{
  brand: "Lucid - لوسيد",
  models: [
    "Air Pure - إير بيور",
    "Air Touring - إير تورينج",
    "Air Grand Touring - إير جراند تورينج",
    "Air Sapphire - إير سافاير",
    "Gravity - جرافيتي"
  ]
},
{
  brand: "Acura - أكيورا",
  models: [
    // Sedans
    "ILX - آي إل إكس",
    "Integra - إنتيجرا",
    "TLX - تي إل إكس",
    "RLX - آر إل إكس",
    "TL - تي إل",
    "RL - آر إل",

    // SUVs & Crossovers
    "ADX - إيه دي إكس",
    "RDX - آر دي إكس",
    "MDX - إم دي إكس",
    "ZDX - زد دي إكس",

    // Sports Cars
    "NSX - إن إس إكس",

    // Hatchbacks
    "RSX - آر إس إكس",

    // Classic
    "Legend - ليجند",
    "Vigor - فيجور",
    "CL - سي إل"
  ]
},
{
  brand: "Suzuki - سوزوكي",
  models: [
    // Hatchbacks
    "Alto - ألتو",
    "Celerio - سيليريو",
    "Swift - سويفت",
    "Baleno - بالينو",
    "Ignis - إجنيس",
    "Splash - سبلاش",
    "Wagon R - واجون R",

    // Sedans
    "Dzire - ديزاير",
    "Ciaz - سياز",
    "Kizashi - كيزاشي",

    // SUVs & Crossovers
    "Jimny - جيمني",
    "Vitara - فيتارا",
    "Grand Vitara - جراند فيتارا",
    "S-Cross - إس كروس",
    "XL7 - إكس إل 7",
    "Across - أكروس",
    "Fronx - فرونكس",

    // MPVs
    "Ertiga - إرتيجا",
    "APV - إيه بي في",

    // Pickup
    "Carry - كاري",

    // Sports
    "Swift Sport - سويفت سبورت"
  ]
},
{
  brand: "Subaru - سوبارو",
  models: [
    // Sedans
    "Impreza - إمبريزا",
    "Legacy - ليجاسي",
    "WRX - دبليو آر إكس",
    "WRX STI - دبليو آر إكس STI",

    // Hatchbacks
    "Impreza Hatchback - إمبريزا هاتشباك",

    // SUVs & Crossovers
    "Crosstrek - كروستريك",
    "Forester - فوريستر",
    "Outback - أوتباك",
    "Ascent - أسينت",
    "Solterra - سولتيرا",
    "Tribeca - تريبيكا",

    // Sports Cars
    "BRZ - بي آر زد",

    // Performance
    "Levorg - ليفورج",
    "SVX - إس في إكس",
    "Baja - باخا"
  ]
},
{
  brand: "Daihatsu - دايهاتسو",
  models: [
    // Hatchbacks
    "Mira - ميرا",
    "Move - موف",
    "Cuore - كيوري",
    "Sirion - سيريون",
    "Boon - بون",
    "Ayla - أيلا",
    "Esse - إيسي",

    // Sedans
    "Charade - شاريد",
    "Applause - أبلاوز",

    // SUVs & Crossovers
    "Terios - تيريوس",
    "Rocky - روكي",
    "Taft - تافت",
    "Bezza - بيزا",

    // MPVs
    "Xenia - زينيا",
    "Luxio - لوكسيو",
    "Gran Max - جران ماكس",

    // Pickup & Commercial
    "Hijet - هايجيت",
    "Gran Max Pickup - جران ماكس بيك أب",

    // Classic
    "Feroza - فيروزا",
    "Rugger - راجر"
  ]
},


{
  brand: "Peugeot - بيجو",
  models: [
    // City / Hatchbacks
    "108 - 108",
    "208 - 208",
    "308 - 308",

    // Sedans
    "301 - 301",
    "408 - 408",

    // SUVs & Crossovers
    "2008 - 2008",
    "3008 - 3008",
    "4008 - 4008",
    "5008 - 5008",

    // MPVs / Vans
    "Rifter - ريفتر",
    "Traveller - ترافيلر",
    "Partner - بارتنر",
    "Expert - إكسبرت",
    "Boxer - بوكسر",

    // Electric
    "e-208 - إي-208",
    "e-2008 - إي-2008",
    "e-308 - إي-308",
    "e-3008 - إي-3008",
    "e-Rifter - إي-ريفتر",
    "e-Traveller - إي-ترافيلر",
    "e-Partner - إي-بارتنر",
    "e-Expert - إي-إكسبرت",
    "e-Boxer - إي-بوكسر",

    // Performance / Legacy
    "RCZ - آر سي زد",
    "508 - 508",
    "508 SW - 508 إس دبليو",
    "308 GTi - 308 جي تي آي"
  ]
},
{
  brand: "Renault - رينو",
  models: [
    // City / Hatchbacks
    "Twingo - توينجو",
    "Clio - كليو",
    "Megane - ميجان",
    "Zoe - زوي",

    // Sedans
    "Talisman - تاليسمان",
    "Fluence - فلونس",
    "Logan - لوجان",
    "Taliant - تاليانت",

    // SUVs & Crossovers
    "Captur - كابتشر",
    "Kadjar - كادجار",
    "Austral - أوسترال",
    "Arkana - أركانا",
    "Duster - داستر",
    "Koleos - كوليوس",
    "Kiger - كايجر",
    "Kwid - كويد",
    "Triber - ترايبر",
    "Bigster - بيجستر",

    // MPVs / Vans
    "Espace - إسباس",
    "Scenic - سينيك",
    "Kangoo - كانجو",
    "Trafic - ترافيك",
    "Master - ماستر",
    "Lodgy - لودجي",

    // Electric
    "Megane E-Tech - ميجان إي-تيك",
    "Scenic E-Tech - سينيك إي-تيك",
    "5 E-Tech - 5 إي-تيك",
    "4 E-Tech - 4 إي-تيك",
    "Kangoo E-Tech - كانجو إي-تيك",
    "Master E-Tech - ماستر إي-تيك",

    // Performance / Sport
    "Clio RS - كليو RS",
    "Megane RS - ميجان RS",
    "Alpine A110 - ألبين A110"
  ]
},
{
  brand: "Citroen - سيتروين",
  models: [
    // City / Hatchbacks
    "C1 - سي 1",
    "C3 - سي 3",
    "C4 - سي 4",
    "C4 X - سي 4 إكس",

    // Sedans
    "C-Elysee - سي إليزيه",

    // SUVs & Crossovers
    "C3 Aircross - سي 3 إيركروس",
    "C4 Aircross - سي 4 إيركروس",
    "C5 Aircross - سي 5 إيركروس",
    "C5 X - سي 5 إكس",
    "Basalt - بازلت",

    // MPVs / Vans
    "Berlingo - برلينجو",
    "SpaceTourer - سبيس تورر",
    "Jumpy - جامبي",
    "Jumper - جامبر",

    // Electric
    "e-C3 - إي-سي 3",
    "e-C4 - إي-سي 4",
    "e-C4 X - إي-سي 4 إكس",
    "e-Berlingo - إي-برلينجو",
    "e-SpaceTourer - إي-سبيس تورر",
    "e-Jumpy - إي-جامبي",
    "e-Jumper - إي-جامبر",
    "Ami - آمي"
  ]
},
{
  brand: "DS Automobiles - دي إس",
  models: [
    // Sedans
    "DS 4 - دي إس 4",
    "DS 9 - دي إس 9",

    // SUVs & Crossovers
    "DS 3 - دي إس 3",
    "DS 7 - دي إس 7",
    "DS 8 - دي إس 8",

    // Electric
    "DS 3 E-Tense - دي إس 3 إي-تنس",
    "DS 4 E-Tense - دي إس 4 إي-تنس",
    "DS 7 E-Tense - دي إس 7 إي-تنس",
    "DS 9 E-Tense - دي إس 9 إي-تنس"
  ]
},
 
  // ==============================
  // SWEDISH / SCANDINAVIAN BRANDS
  // ==============================
{
  brand: "Volvo - فولفو",
  models: [
    // Sedans
    "S60 - إس 60",
    "S90 - إس 90",

    // Wagons / Estates
    "V60 - في 60",
    "V60 Cross Country - في 60 كروس كانتري",
    "V90 - في 90",
    "V90 Cross Country - في 90 كروس كانتري",

    // SUVs & Crossovers
    "XC40 - إكس سي 40",
    "XC60 - إكس سي 60",
    "XC90 - إكس سي 90",

    // Electric
    "EX30 - إي إكس 30",
    "EX40 - إي إكس 40",
    "EC40 - إي سي 40",
    "EX90 - إي إكس 90",
    "ES90 - إي إس 90",
    "C40 Recharge - سي 40 ريتشارج",

    // Legacy
    "V40 - في 40",
    "S40 - إس 40",
    "C30 - سي 30",
    "C70 - سي 70"
  ]
},
{
  brand: "Polestar - بولستار",
  models: [
    "Polestar 1 - بولستار 1",
    "Polestar 2 - بولستار 2",
    "Polestar 3 - بولستار 3",
    "Polestar 4 - بولستار 4",
    "Polestar 5 - بولستار 5",
    "Polestar 6 - بولستار 6"
  ]
},
{
  brand: "Scania - سكانيا",
  models: [
    // Trucks
    "R Series - آر سيريز",
    "S Series - إس سيريز",
    "P Series - بي سيريز",
    "G Series - جي سيريز",
    "L Series - إل سيريز",
    "XT Series - إكس تي سيريز",

    // Buses & Coaches
    "Citywide - سيتي وايد",
    "Interlink - إنترلينك",
    "Touring - تورينج",
    "Fencer - فينسر",

    // Engines / Industrial
    "Scania Engines (Marine & Industrial) - محركات سكانيا (بحرية وصناعية)"
  ]
},
 
  // ==============================
  // CHINESE BRANDS
  // ==============================
{
  brand: "BYD - بي واي دي",
  models: [
    // Sedans
    "Seal - سيل",
    "Seal 06 - سيل 06",
    "Han - هان",
    "Qin - تشين",
    "Qin Plus - تشين بلس",
    "Destroyer 05 - ديستروير 05",

    // Hatchbacks
    "Dolphin - دولفين",
    "Seagull - سيجال",
    "Dolphin Mini - دولفين ميني",

    // SUVs & Crossovers
    "Atto 3 - أتو 3",
    "Song Plus - سونج بلس",
    "Song L - سونج L",
    "Song Pro - سونج برو",
    "Tang - تانج",
    "Yuan Plus - يوان بلس",
    "Yuan Up - يوان أب",
    "Sealion 05 - سيليون 05",
    "Sealion 06 - سيليون 06",
    "Sealion 07 - سيليون 07",
    "Sealion 09 - سيليون 09",

    // MPVs
    "Denza D9 - دينزا D9",

    // Performance / Luxury
    "Yangwang U8 - يانج وانج U8",
    "Yangwang U9 - يانج وانج U9",
    "Fangchengbao Bao 5 - فانج تشنج باو 5",
    "Denza N7 - دينزا N7",
    "Denza N8 - دينزا N8",
    "Denza Z9 - دينزا Z9"
  ]
},
{
  brand: "Geely - جيلي",
  models: [
    // Sedans
    "Emgrand - إمجراند",
    "Preface - بريفيس",
    "Geometry A - جيومتري A",

    // Hatchbacks
    "Vision - فيجن",

    // SUVs & Crossovers
    "Coolray - كولراي",
    "Azkarra - أزكارا",
    "Atlas - أطلس",
    "Atlas Pro - أطلس برو",
    "Monjaro - مونجارو",
    "Tugella - توجيلا",
    "Boyue - بويي",
    "Xingyue L - شينغيو L",

    // MPVs
    "Jiaji - جياجي",

    // Electric
    "Geometry C - جيومتري C",
    "Geometry E - جيومتري E",
    "Panda Mini EV - باندا ميني EV",
    "Galaxy E8 - جالاكسي E8",
    "Galaxy L6 - جالاكسي L6",
    "Galaxy L7 - جالاكسي L7",
    "Starray - ستاراي"
  ]
},
{
  brand: "Chery - شيري",
  models: [
    // Sedans
    "Arrizo 5 - أريزو 5",
    "Arrizo 6 - أريزو 6",
    "Arrizo 8 - أريزو 8",

    // Hatchbacks
    "QQ Ice Cream - كيو كيو آيس كريم",

    // SUVs & Crossovers
    "Tiggo 2 - تيجو 2",
    "Tiggo 3 - تيجو 3",
    "Tiggo 4 - تيجو 4",
    "Tiggo 5X - تيجو 5X",
    "Tiggo 7 - تيجو 7",
    "Tiggo 7 Pro - تيجو 7 برو",
    "Tiggo 8 - تيجو 8",
    "Tiggo 8 Pro - تيجو 8 برو",
    "Tiggo 9 - تيجو 9",

    // Electric
    "eQ1 - إي كيو 1",
    "eQ7 - إي كيو 7",
    "Fulwin - فولوين",

    // Pickup
    "Chery Wagon (Ute) - شيري واجن"
  ]
},
{
  brand: "Jetour - جيتور",
  models: [
    "Dashing - داشينج",
    "X70 - إكس 70",
    "X70 Plus - إكس 70 بلس",
    "X90 - إكس 90",
    "X90 Plus - إكس 90 بلس",
    "T2 - تي 2",
    "T1 - تي 1",
    "Traveller - ترافيلر",
    "Ice Cream - آيس كريم",
    "Freedom - فريدوم",
    "X50 - إكس 50"
  ]
},
{
  brand: "Exeed - إكسيد",
  models: [
    "TXL - تي إكس إل",
    "LX - إل إكس",
    "RX - آر إكس",
    "VX - في إكس",
    "TX - تي إكس",
    "Sterra ES - ستيرا ES",
    "Sterra ET - ستيرا ET"
  ]
},
{
  brand: "Haval - هافال",
  models: [
    // SUVs & Crossovers
    "Jolion - جوليون",
    "H6 - إتش 6",
    "H6 GT - إتش 6 GT",
    "H9 - إتش 9",
    "Dargo - دارجو",
    "Big Dog - بيج دوج",
    "Raptor - رابتور",
    "M6 - إم 6",
    "H2 - إتش 2",
    "F7 - إف 7",
    "F7x - إف 7 إكس",

    // Electric / Hybrid
    "H6 Hybrid - إتش 6 هايبرد",
    "Jolion Hybrid - جوليون هايبرد"
  ]
},
{
  brand: "GWM - جريت وول موتورز",
  models: [
    // Pickup Trucks
    "Cannon - كانون",
    "Cannon Alpha - كانون ألفا",
    "Poer - باور",

    // SUVs
    "Haval H6 (GWM branded markets) - هافال H6",

    // Electric / Hybrid
    "Ora Good Cat - أورا جود كات",
    "Wey Coffee 01 - واي كوفي 01"
  ]
},


{
  brand: "Tank - تانك",
  models: [
    "Tank 300 - تانك 300",
    "Tank 400 - تانك 400",
    "Tank 500 - تانك 500",
    "Tank 700 - تانك 700",
    "Tank 800 - تانك 800"
  ]
},
{
  brand: "Ora - أورا",
  models: [
    "Good Cat - جود كات",
    "Funky Cat - فانكي كات",
    "Lightning Cat - لايتنينج كات",
    "Ballet Cat - باليه كات",
    "Punk Cat - بانك كات",
    "03 - 03",
    "07 - 07"
  ]
},
{
  brand: "BAIC - بايك",
  models: [
    "X25 - إكس 25",
    "X35 - إكس 35",
    "X55 - إكس 55",
    "X7 - إكس 7",
    "U5 Plus - يو 5 بلس",
    "EU5 - إي يو 5",
    "EX3 - إي إكس 3",
    "Magic V - ماجيك V"
  ]
},
{
  brand: "Beijing - بكين",
  models: [
    "Beijing X7 - بكين X7",
    "Beijing X5 - بكين X5",
    "Beijing X3 - بكين X3",
    "Beijing U5 - بكين U5",
    "Beijing EU5 - بكين EU5"
  ]
},
{
  brand: "ARCFOX - آركفوكس",
  models: [
    "Alpha S - ألفا S",
    "Alpha T - ألفا T",
    "Alpha S5 - ألفا S5",
    "Alpha S HI - ألفا S HI",
    "Kaola - كاولا",
    "ECF - إي سي إف"
  ]
},
{
  brand: "Bestune - بيستون",
  models: [
    "T77 - تي 77",
    "T99 - تي 99",
    "T55 - تي 55",
    "T33 - تي 33",
    "B70 - بي 70",
    "B70S - بي 70 إس",
    "NAT - إن إيه تي",
    "Xiaoma - شياوما"
  ]
},
{
  brand: "Hongqi - هونغ تشي",
  models: [
    // Sedans
    "H5 - إتش 5",
    "H6 - إتش 6",
    "H9 - إتش 9",
    "L5 - إل 5",

    // SUVs & Crossovers
    "HS5 - إتش إس 5",
    "HS7 - إتش إس 7",
    "HS3 - إتش إس 3",
    "HS9 - إتش إس 9",

    // Electric
    "E-HS9 - إي إتش إس 9",
    "E-QM5 - إي كيو إم 5",
    "EHS7 - إي إتش إس 7"
  ]
},
{
  brand: "JAC - جاك",
  models: [
    "JS3 - جي إس 3",
    "JS4 - جي إس 4",
    "JS6 - جي إس 6",
    "JS7 - جي إس 7",
    "Sehol A5 - سيهول A5",
    "Sehol X8 - سيهول X8",
    "iEV7 - آي إي في 7",
    "iEVA50 - آي إي في A50",
    "T6 (Pickup) - تي 6 بيك أب"
  ]
},

{
  brand: "Maxus - ماكسوس",
  models: [
    // Vans
    "V80 - في 80",
    "Deliver 9 - ديلفر 9",
    "eDeliver3 - إي ديلفر 3",
    "eDeliver9 - إي ديلفر 9",

    // SUVs
    "D60 - دي 60",
    "D90 - دي 90",
    "T60 (Pickup) - تي 60 بيك أب",
    "T90 (Pickup) - تي 90 بيك أب",

    // Electric
    "Euniq5 - يونيك 5",
    "Euniq6 - يونيك 6",
    "Mifa 9 - ميفا 9"
  ]
},
{
  brand: "SAIC - سايك",
  models: [
    "Roewe RX5 - رووي RX5",
    "MG HS - إم جي HS",
    "Maxus T90 - ماكسوس T90",
    "SAIC iM8 - سايك iM8"
  ]
},
{
  brand: "MG - إم جي",
  models: [
    // Hatchbacks
    "MG3 - إم جي 3",
    "MG4 EV - إم جي 4 EV",

    // Sedans
    "MG5 - إم جي 5",
    "MG6 - إم جي 6",

    // SUVs & Crossovers
    "ZS - زد إس",
    "HS - إتش إس",
    "RX5 - آر إكس 5",
    "RX8 - آر إكس 8",
    "MG One - إم جي ون",

    // Electric
    "MG4 - إم جي 4",
    "MG5 EV - إم جي 5 EV",
    "Marvel R - مارفل R",
    "ZS EV - زد إس EV",
    "Cyberster - سايبرستر",

    // MPVs
    "MG M9 - إم جي M9"
  ]
},
{
  brand: "Roewe - رووي",
  models: [
    "RX5 - آر إكس 5",
    "RX8 - آر إكس 8",
    "i5 - آي 5",
    "i6 - آي 6",
    "Ei5 - إي آي 5",
    "Marvel X - مارفل X",
    "Marvel R - مارفل R",
    "iMAX8 - آي ماكس 8",
    "D5X - دي 5 إكس"
  ]
},
{
  brand: "Wuling - وولينج",
  models: [
    "Hongguang Mini EV - هونغوانغ ميني EV",
    "Bingo - بينجو",
    "Air EV - إير EV",
    "Confero - كونفيرو",
    "Almaz - ألماز",
    "Alvez - ألفيز",
    "Victory - فيكتوري",
    "Cortez - كورتيز"
  ]
},
{
  brand: "Dongfeng - دونغ فينغ",
  models: [
    "Fengon - فينجون",
    "Fengxing SX6 - فينجشينج SX6",
    "AX7 - إيه إكس 7",
    "S30 - إس 30",
    "eπ 007 - إي باي 007",
    "Box - بوكس"
  ]
},
{
  brand: "DFSK - دي إف إس كيه",
  models: [
    "Glory 500 - جلوري 500",
    "Glory 580 - جلوري 580",
    "Glory 560 - جلوري 560",
    "Glory i-Auto - جلوري آي أوتو",
    "K01 - كي 01",
    "K05 - كي 05"
  ]
},
{
  brand: "Forthing - فورثينج",
  models: [
    "T5 EVO - تي 5 إيفو",
    "T5 - تي 5",
    "M5 - إم 5",
    "U-Tour - يو تور",
    "Friday - فرايدي"
  ]
},

{
  brand: "GAC - جي إيه سي",
  models: [
    "Trumpchi GS3 - ترامبتشي GS3",
    "Trumpchi GS4 - ترامبتشي GS4",
    "Trumpchi GS8 - ترامبتشي GS8",
    "Trumpchi M8 - ترامبتشي M8",
    "Empow - إمباو",
    "Emzoom - إمزوم"
  ]
},
{
  brand: "Aion - أيون",
  models: [
    "Aion S - أيون S",
    "Aion Y - أيون Y",
    "Aion V - أيون V",
    "Aion LX - أيون LX",
    "Aion Y Plus - أيون Y بلس",
    "Hyper GT - هايبر GT",
    "Hyper SSR - هايبر SSR",
    "Hyptec HT - هايبتك HT"
  ]
},
{
  brand: "Trumpchi - ترامبتشي",
  models: [
    "GS3 - جي إس 3",
    "GS4 - جي إس 4",
    "GS8 - جي إس 8",
    "M8 - إم 8",
    "M6 - إم 6",
    "E9 - إي 9",
    "S7 - إس 7"
  ]
},
{
  brand: "Changan - شانجان",
  models: [
    // Sedans
    "Eado - إيدو",
    "Alsvin - ألسفين",

    // SUVs & Crossovers
    "CS35 Plus - سي إس 35 بلس",
    "CS55 Plus - سي إس 55 بلس",
    "CS75 Plus - سي إس 75 بلس",
    "CS85 Coupe - سي إس 85 كوبيه",
    "CS95 - سي إس 95",
    "UNI-T - يوني-تي",
    "UNI-K - يوني-كي",
    "UNI-V - يوني-في",

    // Electric
    "Lumin - لومين",
    "Benni E-Star - بيني إي-ستار",
    "Nevo - نيفو"
  ]
},
{
  brand: "Deepal - ديبال",
  models: [
    "S7 - إس 7",
    "SL03 - إس إل 03",
    "S05 - إس 05",
    "L07 - إل 07"
  ]
},
{
  brand: "Avatr - أفاتر",
  models: [
    "Avatr 11 - أفاتر 11",
    "Avatr 12 - أفاتر 12",
    "Avatr 07 - أفاتر 07"
  ]
},
{
  brand: "Omoda - أومودا",
  models: [
    "Omoda 5 - أومودا 5",
    "Omoda C5 - أومودا C5",
    "Omoda E5 - أومودا E5",
    "Omoda C9 - أومودا C9"
  ]
},
{
  brand: "Jaecoo - جايكو",
  models: [
    "Jaecoo 7 - جايكو 7",
    "Jaecoo 8 - جايكو 8",
    "Jaecoo J8 - جايكو J8",
    "Jaecoo J7 - جايكو J7"
  ]
},


{
  brand: "Lynk & Co - لينك آند كو",
  models: [
    "01 - 01",
    "02 - 02",
    "03 - 03",
    "05 - 05",
    "06 - 06",
    "08 - 08",
    "09 - 09"
  ]
},
{
  brand: "Zeekr - زيكر",
  models: [
    "001 - 001",
    "007 - 007",
    "009 - 009",
    "X - إكس",
    "7X - 7X",
    "MIX - ميكس"
  ]
},
{
  brand: "NIO - نيو",
  models: [
    // Sedans
    "ET5 - إي تي 5",
    "ET5T - إي تي 5 تي",
    "ET7 - إي تي 7",
    "ET9 - إي تي 9",

    // SUVs & Crossovers
    "ES6 - إي إس 6",
    "ES7 - إي إس 7",
    "ES8 - إي إس 8",
    "EC6 - إي سي 6",
    "EC7 - إي سي 7",

    // Sub-brand
    "Onvo L60 - أونفو L60",
    "Firefly - فايرفلاي"
  ]
},
{
  brand: "XPeng - إكس بينج",
  models: [
    "P5 - بي 5",
    "P7 - بي 7",
    "P7i - بي 7 آي",
    "G3 - جي 3",
    "G6 - جي 6",
    "G9 - جي 9",
    "X9 - إكس 9",
    "Mona M03 - مونا M03"
  ]
},
{
  brand: "Li Auto - لي أوتو",
  models: [
    "Li ONE - لي ون",
    "L6 - إل 6",
    "L7 - إل 7",
    "L8 - إل 8",
    "L9 - إل 9",
    "MEGA - ميجا"
  ]
},
{
  brand: "Leapmotor - ليب موتور",
  models: [
    "T03 - تي 03",
    "C10 - سي 10",
    "C11 - سي 11",
    "C16 - سي 16",
    "B10 - بي 10",
    "S01 - إس 01"
  ]
},
{
  brand: "Seres - سيريس",
  models: [
    "SF5 - إس إف 5",
    "Seres 3 - سيريس 3",
    "Seres 5 - سيريس 5",
    "AITO M5 - آيتو M5",
    "AITO M7 - آيتو M7",
    "AITO M9 - آيتو M9"
  ]
},
{
  brand: "Voyah - فوياه",
  models: [
    "Free - فري",
    "Dreamer - دريمر",
    "Passion - باشن",
    "Courage - كوريج"
  ]
},
{
  brand: "Other - أخرى",
  models: [
    "Other - أخرى"
  ]
}
];

export const vehicleBrands = vehicleCatalog.map((item) => item.brand);

export const getVehicleModelsByBrand = (brand?: string | null) => {
  if (!brand) return [];

  const selected = vehicleCatalog.find(
    (item) => item.brand.toLowerCase() === String(brand).trim().toLowerCase()
  );

  return selected?.models || [];
};