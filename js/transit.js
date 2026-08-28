/* NCT 首尔同款地图 · 交通数据（公交路线规划 + 气候卡标注） */


/* NCT 首尔同款地图 · 首尔地铁公共交通图
 * 用途：公共交通路线规划 + 气候卡（기후동행카드）可用路段标注
 * 说明：
 *  - 站间耗时按每站约 2.5 分钟估算，换乘按 6 分钟估算，仅供参考，请以 Naver Map 实时公交为准。
 *  - 气候卡适用：首尔市界内 1~9 号线、支线、盆唐/京义中央/机场铁路（一般）等路段；
 *    超出首尔市界（如富川、河南渼沙、龙仁等）或机场快线直达/高速巴士不可用。
 */
var TRANSIT = (function () {
  'use strict';
  var ST = [["cheongnyangni","청량리역","清凉里站",["L1","BD","GJ"],true],["jegi","제기동역","祭基洞站",["L1"],true],["sinseoldong","신설동역","新设洞站",["L1","L2B"],true],["dongmyo","동묘앞역","东庙前站",["L1","L6"],true],["dongdaemun","동대문역","东大门站",["L1","L4"],true],["jongno5ga","종로5가역","钟路5街站",["L1"],true],["jongno3ga","종로3가역","钟路3街站",["L1","L3","L5"],true],["jonggak","종각역","钟阁站",["L1"],true],["cityhall","시청역","市厅站",["L1","L2"],true],["seoulstation","서울역","首尔站",["L1","L4","AR","GJ"],["L1","L4","AR","GJ"]],["namyeong","남영역","南营站",["L1"],true],["yongsan","용산역","龙山站",["L1","GJE"],["L1","GJ"]],["noryangjin","노량진역","鹭梁津站",["L1","L9"],true],["daebang","대방역","大方站",["L1"],true],["singil","신길역","新吉站",["L1","L5"],true],["yeongdeungpo","영등포역","永登浦站",["L1"],true],["sindorim","신도림역","新道林站",["L1","L2","L2C"],["L1","L2"]],["guro","구로역","九老站",["L1"],true],["guil","구일역","九一站",["L1"],true],["gocheok","고척역","高尺站",["L1"],true],["gaebong","개봉역","开峰站",["L1"],true],["oryudong","오류동역","梧柳洞站",["L1"],true],["yeokgok","역곡역","驿谷站",["L1"],false],["bucheon","부천역","富川站",["L1"],false],["euljiro1","을지로입구역","乙支路入口站",["L2"],true],["euljiro3","을지로3가역","乙支路3街站",["L2","L3"],true],["euljiro4","을지로4가역","乙支路4街站",["L2","L5"],true],["dongdaemunhdc","동대문역사문화공원역","东大门历史文化公园站",["L2","L4","L5"],true],["sindang","신당역","新堂站",["L2","L6"],true],["sangwangsimni","상왕십리역","上往十里站",["L2"],true],["wangsimni","왕십리역","往十里站",["L2","L5","BD","GJ"],true],["hanyangdae","한양대역","汉阳大站",["L2"],true],["ttukseom","뚝섬역","纛岛站",["L2"],true],["seongsu","성수역","圣水站",["L2","L2B"],["L2"]],["geondae","건대입구역","建大入口站",["L2","L7"],true],["guui","구의역","九宜站",["L2"],true],["gangbyeon","강변역","江边站",["L2"],true],["jamsil","잠실역","蚕室站",["L2","L8"],true],["jamsilsaenae","잠실새내역","蚕室新川站",["L2"],true],["jonghapundong","종합운동장역","综合运动场站",["L2","L9"],true],["samseong","삼성역","三星站",["L2"],true],["seolleung","선릉역","宣陵站",["L2","BD"],true],["yeoksam","역삼역","驿三站",["L2"],true],["gangnam","강남역","江南站",["L2","SB"],true],["gyodae","교대역","教大站",["L2","L3"],true],["seocho","서초역","瑞草站",["L2"],true],["bangbae","방배역","方背站",["L2"],true],["sadang","사당역","舍堂站",["L2","L4"],true],["nakseongdae","낙성대역","落星垈站",["L2"],true],["seouldaeipgu","서울대입구역","首尔大入口站",["L2"],true],["bongcheon","봉천역","奉天站",["L2"],true],["sinrim","신림역","新林站",["L2"],true],["sindaebang","신대방역","新大方站",["L2"],true],["gurodigital","구로디지털단지역","九老数码园地站",["L2"],true],["daerim","대림역","大林站",["L2","L7"],true],["munrae","문래역","文来站",["L2"],true],["yeongdeungpogu","영등포구청역","永登浦区厅站",["L2","L5"],true],["dangsan","당산역","堂山站",["L2","L9"],true],["hapjeong","합정역","合井站",["L2","L6"],true],["hongdae","홍대입구역","弘大入口站",["L2","GJ","AR"],["L2","GJ","AR"]],["sinchon","신촌역","新村站",["L2"],true],["idae","이대역","梨大站",["L2"],true],["ahyeon","아현역","阿岘站",["L2"],true],["chungjeongno","충정로역","忠正路站",["L2","L5"],true],["yongdap","용답역","龙踏站",["L2B"],true],["dorimcheon","도림천역","道林川站",["L2C"],true],["yangcheongucheong","양천구청역","阳川区厅站",["L2C"],true],["sinjeongnegeori","신정네거리역","新亭十字路口站",["L2C"],true],["kkachisan","까치산역","卡旨山站",["L2C","L5"],true],["gyeongbokgung","경복궁역","景福宫站",["L3"],true],["anguk","안국역","安国站",["L3"],true],["chungmuro","충무로역","忠武路站",["L3","L4"],true],["dongdaeipgu","동대입구역","东大入口站",["L3"],true],["yaksu","약수역","药水站",["L3","L6"],true],["geumho","금호역","金湖站",["L3"],true],["oksu","옥수역","玉水站",["L3","GJE"],["L3","GJ"]],["apgujeong","압구정역","狎鸥亭站",["L3"],true],["sinsa","신사역","新沙站",["L3"],true],["jamwon","잠원역","蚕院站",["L3"],true],["expresse","고속터미널역","高速巴士客运站",["L3","L7","L9"],true],["nambu","남부터미널역","南部客运站",["L3"],true],["yangjae","양재역","良才站",["L3","SB"],true],["maebong","매봉역","梅峰站",["L3"],true],["dogok","도곡역","道谷站",["L3","BD"],true],["myeongdong","명동역","明洞站",["L4"],true],["hoehyeon","회현역","会贤站",["L4"],true],["sukdaeeipgu","숙대입구역","淑大入口站",["L4"],true],["samgakji","삼각지역","三角地站",["L4","L6"],true],["sinyongsan","신용산역","新龙山站",["L4"],true],["ichon","이촌역","二村站",["L4","GJE"],["L4","GJ"]],["dongjak","동작역","铜雀站",["L4","L9"],true],["chongsin","총신대입구역","总神大入口站",["L4","L7"],true],["isu","이수역","梨水站",["L7"],["L4","L7"]],["banghwa","방화역","傍花站",["L5"],true],["gaehwasan","개화산역","开花山站",["L5"],true],["gimpogonghang","김포공항역","金浦机场站",["L5","L9","AR"],true],["balsan","발산역","钵山站",["L5"],true],["hwagok","화곡역","禾谷站",["L5"],true],["sinjeong","신정역","新亭站",["L5"],true],["mokdong","목동역","木洞站",["L5"],true],["omokgyo","오목교역","梧木桥站",["L5"],true],["yangpyeong","양평역","杨坪站",["L5"],true],["yeongdeungposijang","영등포시장역","永登浦市场站",["L5"],true],["yeouido","여의도역","汝矣岛站",["L5","L9"],true],["yeouinaru","여의나루역","汝矣渡口站",["L5"],true],["mapo","마포역","麻浦站",["L5"],true],["gongdeok","공덕역","孔德站",["L5","L6","GJ","GJE","AR"],["L5","L6","GJ","AR"]],["aegae","애오개역","儿岭站",["L5"],true],["seodaemun","서대문역","西大门站",["L5"],true],["gwanghwamun","광화문역","光化门站",["L5"],true],["cheonggu","청구역","青丘站",["L5","L6"],true],["singeumho","신금호역","新金湖站",["L5"],true],["haengdang","행당역","杏堂站",["L5"],true],["majang","마장역","马场站",["L5"],true],["dapsimni","답십리역","踏十里站",["L5"],true],["janghanpyeong","장한평역","长汉坪站",["L5"],true],["gunja","군자역","君子站",["L5","L7"],true],["achasan","아차산역","峨嵯山站",["L5"],true],["gwangnaru","광나루역","广津渡口站",["L5"],true],["cheonho","천호역","千户站",["L5","L8"],true],["gangdong","강동역","江东站",["L5","L5B"],["L5"]],["gildong","길동역","吉洞站",["L5"],true],["gulbeundari","굽은다리역","曲桥站",["L5"],true],["myeongil","명일역","明逸站",["L5"],true],["godeok","고덕역","高德站",["L5"],true],["sangildong","상일동역","上一洞站",["L5"],true],["gangil","강일역","江一站",["L5"],true],["misa","미사역","渼沙站",["L5"],false],["dunchon","둔촌동역","遁村洞站",["L5B"],["L5"]],["olympicpark","올림픽공원역","奥林匹克公园站",["L5B","L9"],["L5","L9"]],["bangi","방이역","芳荑站",["L5B"],["L5"]],["ogeum","오금역","梧琴站",["L5B"],["L5"]],["digiteol","디지털미디어시티역","数码媒体城站",["L6","GJ","AR"],true],["worldcup","월드컵경기장역","世界杯竞技场站",["L6"],true],["mapocheong","마포구청역","麻浦区厅站",["L6"],true],["mangwon","망원역","望远站",["L6"],true],["sangsu","상수역","上水站",["L6"],true],["gwangheungchang","광흥창역","广兴仓站",["L6"],true],["daeheung","대흥역","大兴站",["L6"],true],["hyochang","효창공원앞역","孝昌公园前站",["L6","GJE"],["L6","GJ"]],["noksapyeong","녹사평역","绿莎坪站",["L6"],true],["itaewon","이태원역","梨泰院站",["L6"],true],["hanggangjin","한강진역","汉江镇站",["L6"],true],["beotigogae","버티고개역","Berti Hill站",["L6"],true],["changsin","창신역","昌信站",["L6"],true],["bomon","보문역","普门站",["L6"],true],["anam","안암역","安岩站",["L6"],true],["korea","고려대역","高丽大站",["L6"],true],["wolgok","월곡역","月谷站",["L6"],true],["sangwolgok","상월곡역","上月谷站",["L6"],true],["dolgoji","돌곶이역","石串站",["L6"],true],["seokgye","석계역","石溪站",["L6"],true],["taereung","태릉입구역","泰陵入口站",["L6"],true],["hwarangdae","화랑대역","花郎大站",["L6"],true],["bonghwasan","봉화산역","烽火山站",["L6"],true],["sinnae","신내역","新内站",["L6"],true],["myeonmok","면목역","面牧站",["L7"],true],["sagajeong","사가정역","四佳亭站",["L7"],true],["yongmasan","용마산역","龙马山站",["L7"],true],["junggok","중곡역","中谷站",["L7"],true],["eorini","어린이대공원역","儿童大公园站",["L7"],true],["jayang","자양역","紫阳站",["L7"],true],["ttukseomyuwonji","뚝섬유원지역","纛岛游园地站",["L7"],true],["cheongdam","청담역","清潭站",["L7"],true],["gangnamgucheong","강남구청역","江南区厅站",["L7","BD"],true],["hakdong","학동역","鹤洞站",["L7"],true],["nonhyeon","논현역","论岘站",["L7"],true],["banpo","반포역","盘浦站",["L7"],true],["naebang","내방역","内方站",["L7"],true],["namseong","남성역","南城站",["L7"],true],["sungseoldae","숭실대입구역","崇实大入口站",["L7"],true],["sangdo","상도역","上道站",["L7"],true],["jangseungbaegi","장승배기역","长丞背基站",["L7"],true],["sindaebangsamgeori","신대방삼거리역","新大方三叉路口站",["L7"],true],["boramae","보라매역","波拉美站",["L7"],true],["sinpung","신풍역","新丰站",["L7"],true],["namguro","남구로역","南九老站",["L7"],true],["gasan","가산디지털단지역","加山数码园地站",["L7"],true],["mongchontoseong","몽촌토성역","梦村土城站",["L8"],true],["songpa","송파역","松坡站",["L8"],true],["garaksijang","가락시장역","可乐市场站",["L8"],true],["munjeong","문정역","文井站",["L8"],true],["jangji","장지역","长旨站",["L8"],true],["bokjeong","복정역","福井站",["L8","BD"],true],["gaehwa","개화역","开花站",["L9"],true],["airportsijang","공항시장역","机场市场站",["L9"],true],["sinbanghwa","신방화역","新傍花站",["L9"],true],["magongnaru","마곡나루역","麻谷渡口站",["L9"],true],["yangcheonhyanggyo","양천향교역","阳川乡校站",["L9"],true],["gayang","가양역","加阳站",["L9"],true],["jeungmi","증미역","曾米站",["L9"],true],["deungchon","등촌역","登村站",["L9"],true],["yeomchang","염창역","盐仓站",["L9"],true],["sinmokdong","신목동역","新木洞站",["L9"],true],["seonyudo","선유도역","仙游岛站",["L9"],true],["gukhoe","국회의사당역","国会议事堂站",["L9"],true],["saetgang","샛강역","赛江站",["L9"],true],["nodle","노들역","鹭得站",["L9"],true],["heukseok","흑석역","黑石站",["L9"],true],["gubanpo","구반포역","九盘浦站",["L9"],true],["sinbanpo","신반포역","新盘浦站",["L9"],true],["sapyeong","사평역","砂平站",["L9"],true],["sinnonhyeon","신논현역","新论岘站",["L9"],true],["eonju","언주역","彦州站",["L9"],true],["seonjeongneung","선정릉역","宣靖陵站",["L9","BD"],true],["samseongjungang","삼성중앙역","三星中央站",["L9"],true],["bongeunsa","봉은사역","奉恩寺站",["L9"],true],["samjeon","삼전역","三田站",["L9"],true],["seokchongobun","석촌고분역","石村古坟站",["L9"],true],["seokchon","석촌역","石村站",["L8","L9"],true],["songpanaru","송파나루역","松坡渡口站",["L9"],true],["hanseongbaekje","한성백제역","汉城百济站",["L9"],true],["dunchonoryun","둔촌오륜역","遁村五轮站",["L9"],true],["jungangbohun","중앙보훈병원역","中央报勋医院站",["L9"],true],["seoulsup","서울숲역","首尔林站",["BD"],true],["apgujeongrodeo","압구정로데오역","狎鸥亭罗德奥站",["BD"],true],["hanti","한티역","HanTi站",["BD"],true],["guryong","구룡역","九龙站",["BD"],true],["gaepodong","개포동역","开浦洞站",["BD"],true],["daemosan","대모산입구역","大母山入口站",["BD"],true],["suseo","수서역","水西站",["BD"],true],["seogang","서강대역","西江大站",["GJ"],["GJ"]],["gajwa","가좌역","加佐站",["GJ"],["GJ"]]];
  var LN = {"L1":{"name":"1号线","color":"#0052a4","stops":["cheongnyangni","jegi","sinseoldong","dongmyo","dongdaemun","jongno5ga","jongno3ga","jonggak","cityhall","seoulstation","namyeong","yongsan","noryangjin","daebang","singil","yeongdeungpo","sindorim","guro","guil","gocheok","gaebong","oryudong","yeokgok","bucheon"]},"L2":{"name":"2号线","color":"#00a84d","stops":["cityhall","euljiro1","euljiro3","euljiro4","dongdaemunhdc","sindang","sangwangsimni","wangsimni","hanyangdae","ttukseom","seongsu","geondae","guui","gangbyeon","jamsil","jamsilsaenae","jonghapundong","samseong","seolleung","yeoksam","gangnam","gyodae","seocho","bangbae","sadang","nakseongdae","seouldaeipgu","bongcheon","sinrim","sindaebang","gurodigital","daerim","sindorim","munrae","yeongdeungpogu","dangsan","hapjeong","hongdae","sinchon","idae","ahyeon","chungjeongno","cityhall"]},"L2B":{"name":"2号线·圣水支线","color":"#00a84d","stops":["sinseoldong","yongdap","seongsu"]},"L2C":{"name":"2号线·新亭支线","color":"#00a84d","stops":["sindorim","dorimcheon","yangcheongucheong","sinjeongnegeori","kkachisan"]},"L3":{"name":"3号线","color":"#ef7d1a","stops":["gyeongbokgung","anguk","jongno3ga","euljiro3","chungmuro","dongdaeipgu","yaksu","geumho","oksu","apgujeong","sinsa","jamwon","expresse","gyodae","nambu","yangjae","maebong","dogok"]},"L4":{"name":"4号线","color":"#00a5de","stops":["dongdaemunhdc","chungmuro","myeongdong","hoehyeon","seoulstation","sukdaeeipgu","samgakji","sinyongsan","ichon","dongjak","chongsin","sadang","dongdaemun"]},"L5":{"name":"5号线","color":"#996cac","stops":["banghwa","gaehwasan","gimpogonghang","balsan","hwagok","kkachisan","sinjeong","mokdong","omokgyo","yangpyeong","yeongdeungpogu","yeongdeungposijang","singil","yeouido","yeouinaru","mapo","gongdeok","aegae","chungjeongno","seodaemun","gwanghwamun","jongno3ga","euljiro4","dongdaemunhdc","cheonggu","singeumho","haengdang","wangsimni","majang","dapsimni","janghanpyeong","gunja","achasan","gwangnaru","cheonho","gangdong","gildong","gulbeundari","myeongil","godeok","sangildong","gangil","misa"]},"L5B":{"name":"5号线·马川支线","color":"#996cac","stops":["gangdong","dunchon","olympicpark","bangi","ogeum"]},"L6":{"name":"6号线","color":"#cd7c2f","stops":["digiteol","worldcup","mapocheong","mangwon","hapjeong","sangsu","gwangheungchang","daeheung","gongdeok","hyochang","samgakji","noksapyeong","itaewon","hanggangjin","beotigogae","yaksu","cheonggu","sindang","dongmyo","changsin","bomon","anam","korea","wolgok","sangwolgok","dolgoji","seokgye","taereung","hwarangdae","bonghwasan","sinnae"]},"L7":{"name":"7号线","color":"#54640d","stops":["myeonmok","sagajeong","yongmasan","junggok","gunja","eorini","geondae","jayang","ttukseomyuwonji","cheongdam","gangnamgucheong","hakdong","nonhyeon","banpo","expresse","naebang","isu","namseong","sungseoldae","sangdo","jangseungbaegi","sindaebangsamgeori","boramae","sinpung","daerim","namguro","gasan"]},"L8":{"name":"8号线","color":"#e7486d","stops":["cheonho","mongchontoseong","jamsil","seokchon","songpa","garaksijang","munjeong","jangji","bokjeong"]},"L9":{"name":"9号线","color":"#b0a4c2","stops":["gaehwa","gimpogonghang","airportsijang","sinbanghwa","magongnaru","yangcheonhyanggyo","gayang","jeungmi","deungchon","yeomchang","sinmokdong","seonyudo","dangsan","gukhoe","yeouido","saetgang","noryangjin","nodle","heukseok","dongjak","gubanpo","sinbanpo","expresse","sapyeong","sinnonhyeon","eonju","seonjeongneung","samseongjungang","bongeunsa","jonghapundong","samjeon","seokchongobun","seokchon","songpanaru","hanseongbaekje","olympicpark","dunchonoryun","jungangbohun"]},"BD":{"name":"盆唐线（水仁盆唐线）","color":"#f5a200","stops":["cheongnyangni","wangsimni","seoulsup","apgujeongrodeo","gangnamgucheong","seonjeongneung","seolleung","hanti","dogok","guryong","gaepodong","daemosan","suseo","bokjeong"]},"GJ":{"name":"京义中央线","color":"#77c4a3","stops":["seoulstation","gongdeok","seogang","hongdae","gajwa"]},"AR":{"name":"机场铁路（一般）","color":"#0090d2","stops":["seoulstation","gongdeok","hongdae","digiteol","gimpogonghang"]},"SB":{"name":"新盆唐线","color":"#d4003b","stops":["gangnam","yangjae"]},"GJE":{"name":"京义中央线","color":"#77c4a3","stops":["gongdeok","hyochang","yongsan","ichon","oksu","wangsimni","cheongnyangni"]}};
  // 线路族：同族线路视为同一条线（如 2号线/圣水支线/新亭支线 → L2 族；5号线/马川支线 → L5 族；京义中央东西段 → GJ 族）
  var FAMILY = {
    L2B: 'L2', L2C: 'L2',
    L5B: 'L5',
    GJE: 'GJ'
  };
  function familyOf(lid) { return FAMILY[lid] || lid; }
  function famName(fid) {
    if (fid === 'L2') return '2号线';
    if (fid === 'L5') return '5号线';
    if (fid === 'GJ') return '京义中央线';
    return (LN[fid] && LN[fid].name) || fid;
  }
  function famColor(fid) {
    var sample = fid === 'GJ' ? 'GJ' : (fid === 'L2' ? 'L2' : (fid === 'L5' ? 'L5' : fid));
    return (LN[sample] && LN[sample].color) || '#888';
  }

  var STATIONS = {};
  var ALIAS = {};
  function addAlias(id, name) {
    var k = String(name || '').replace(/\s+/g, '').toLowerCase();
    if (k && !ALIAS[k]) ALIAS[k] = id;
  }
  ST.forEach(function (s) {
    var st = { id: s[0], ko: s[1], zh: s[2], lines: s[3], climate: !!s[4] };
    STATIONS[st.id] = st;
    addAlias(st.id, s[1]);
    addAlias(st.id, s[1].replace(/역$/, ''));
    addAlias(st.id, s[2]);
    addAlias(st.id, s[2].replace(/站$/, ''));
    addAlias(st.id, st.id);
  });
  var EXTRA = {
    '홍대입구': 'hongdae', '弘大入口': 'hongdae', '弘大入口站': 'hongdae',
    '건대입구': 'geondae', '建大入口': 'geondae', '建大入口站': 'geondae',
    '압구정로데오': 'apgujeongrodeo', '狎鸥亭罗德奥': 'apgujeongrodeo', '狎鸥亭罗德奥站': 'apgujeongrodeo',
    '압구정': 'apgujeong', '狎鸥亭': 'apgujeong', '狎鸥亭站': 'apgujeong',
    '올림픽공원': 'olympicpark', '奥林匹克公园': 'olympicpark', '奥林匹克公园站': 'olympicpark',
    '월드컵경기장': 'worldcup', '世界杯竞技场': 'worldcup', '世界杯体育场': 'worldcup',
    '한강진': 'hanggangjin', '汉江镇': 'hanggangjin', '汉江镇站': 'hanggangjin',
    '성수': 'seongsu', '圣水': 'seongsu', '圣水站': 'seongsu',
    '뚝섬': 'ttukseom', '纛岛': 'ttukseom', '纛岛站': 'ttukseom',
    '신사': 'sinsa', '新沙': 'sinsa', '新沙站': 'sinsa',
    '선릉': 'seolleung', '宣陵': 'seolleung', '宣陵站': 'seolleung',
    '이태원': 'itaewon', '梨泰院': 'itaewon', '梨泰院站': 'itaewon',
    '삼성': 'samseong', '三星': 'samseong', '三星站': 'samseong',
    '잠실': 'jamsil', '蚕室': 'jamsil', '蚕室站': 'jamsil',
    '안국': 'anguk', '安国': 'anguk', '安国站': 'anguk',
    '명동': 'myeongdong', '明洞': 'myeongdong', '明洞站': 'myeongdong',
    '여의도': 'yeouido', '汝矣岛': 'yeouido', '汝矣岛站': 'yeouido',
    '여의나루': 'yeouinaru', '汝矣渡口': 'yeouinaru', '汝矣渡口站': 'yeouinaru',
    '종로3가': 'jongno3ga', '钟路3街': 'jongno3ga', '钟路3街站': 'jongno3ga',
    '을지로3가': 'euljiro3', '乙支路3街': 'euljiro3', '乙支路3街站': 'euljiro3',
    '을지로4가': 'euljiro4', '乙支路4街': 'euljiro4', '乙支路4街站': 'euljiro4',
    '을지로입구': 'euljiro1', '乙支路入口': 'euljiro1', '乙支路入口站': 'euljiro1',
    '망원': 'mangwon', '望远': 'mangwon', '望远站': 'mangwon',
    '화곡': 'hwagok', '禾谷': 'hwagok', '禾谷站': 'hwagok',
    '대흥': 'daeheung', '大兴': 'daeheung', '大兴站': 'daeheung',
    '약수': 'yaksu', '药水': 'yaksu', '药水站': 'yaksu',
    '청구': 'cheonggu', '青丘': 'cheonggu', '青丘站': 'cheonggu',
    '신당': 'sindang', '新堂': 'sindang', '新堂站': 'sindang',
    '용답': 'yongdap', '龙踏': 'yongdap', '龙踏站': 'yongdap',
    '당산': 'dangsan', '堂山': 'dangsan', '堂山站': 'dangsan',
    '영등포구청': 'yeongdeungpogu', '永登浦区厅': 'yeongdeungpogu', '永登浦区厅站': 'yeongdeungpogu',
    '가좌': 'gajwa', '加佐': 'gajwa', '加佐站': 'gajwa',
    '석촌': 'seokchon', '石村': 'seokchon', '石村站': 'seokchon',
    '잠원': 'jamwon', '蚕院': 'jamwon', '蚕院站': 'jamwon',
    '청담': 'cheongdam', '清潭': 'cheongdam', '清潭站': 'cheongdam',
    '발산': 'balsan', '钵山': 'balsan', '钵山站': 'balsan',
    '까치산': 'kkachisan', '卡旨山': 'kkachisan', '카치산': 'kkachisan',
    '어린이대공원': 'eorini', '儿童大公园': 'eorini', '儿童大公园站': 'eorini',
    '논현': 'nonhyeon', '论岘': 'nonhyeon', '论岘站': 'nonhyeon',
    '역삼': 'yeoksam', '驿三': 'yeoksam', '驿三站': 'yeoksam',
    '강남': 'gangnam', '江南': 'gangnam', '江南站': 'gangnam',
    '경복궁': 'gyeongbokgung', '景福宫': 'gyeongbokgung', '景福宫站': 'gyeongbokgung',
    '신용산': 'sinyongsan', '新龙山': 'sinyongsan', '新龙山站': 'sinyongsan',
    '숙대입구': 'sukdaeeipgu', '淑大入口': 'sukdaeeipgu', '淑大入口站': 'sukdaeeipgu',
    '남영': 'namyeong', '南营': 'namyeong', '南营站': 'namyeong',
    '상수': 'sangsu', '上水': 'sangsu', '上水站': 'sangsu',
    '합정': 'hapjeong', '合井': 'hapjeong', '合井站': 'hapjeong',
    '서울숲': 'seoulsup', '首尔林': 'seoulsup', '首尔林站': 'seoulsup',
    '왕십리': 'wangsimni', '往十里': 'wangsimni', '往十里站': 'wangsimni',
    '부천': 'bucheon', '富川': 'bucheon', '富川站': 'bucheon',
    '미사': 'misa', '渼沙': 'misa', '渼沙站': 'misa'
  };
  Object.keys(EXTRA).forEach(function (k) {
    var key = k.replace(/\s+/g, '').toLowerCase();
    if (!ALIAS[key]) ALIAS[key] = EXTRA[k];
  });
  var SPECIAL = { '富川': 'bucheon', '河南渼沙': 'misa', '渼沙': 'misa' };

  var EDGES = {};
  var FAM_BY_EDGE = {};
  function addEdge(a, b, lid) {
    (EDGES[a] = EDGES[a] || []).push(b);
    FAM_BY_EDGE[a + '|' + b] = familyOf(lid);
  }
  Object.keys(LN).forEach(function (lid) {
    var stops = LN[lid].stops;
    for (var i = 0; i < stops.length - 1; i++) {
      var a = stops[i], b = stops[i + 1];
      if (!STATIONS[a] || !STATIONS[b] || a === b) continue;
      addEdge(a, b, lid);
      addEdge(b, a, lid);
    }
  });
  // 每站可用线路族
  var FAM_AT = {};
  Object.keys(STATIONS).forEach(function (sid) {
    var f = {};
    STATIONS[sid].lines.forEach(function (l) { f[familyOf(l)] = true; });
    FAM_AT[sid] = Object.keys(f);
  });

  function resolveStation(str) {
    if (!str) return null;
    var s = String(str);
    for (var k in SPECIAL) { if (s.indexOf(k) >= 0) return SPECIAL[k]; }
    var clean = s
      .replace(/（[^）]*）/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[0-9]+号出口/g, '')
      .split(/[·,、/;；→]/)[0]
      .trim();
    var key = clean.replace(/\s+/g, '').toLowerCase();
    if (ALIAS[key]) return ALIAS[key];
    var key2 = key.replace(/역$/, '').replace(/站$/, '');
    if (ALIAS[key2]) return ALIAS[key2];
    return null;
  }

  function routeBetween(sa, sb) {
    var out = { minutes: 0, stations: [], famSeq: [], transfers: 0, allClimate: true, via: [], ok: true, from: sa, to: sb };
    if (!sa || !sb) { out.ok = false; return out; }
    if (sa === sb) { out.stations = [sa]; out.climate = STATIONS[sa].climate; out.allClimate = STATIONS[sa].climate; return out; }
    var startFams = FAM_AT[sa] || [];
    var dist = {}, prev = {}, visited = {}, pq = [];
    function key(sid, f) { return sid + '|' + f; }
    startFams.forEach(function (f) {
      var k = key(sa, f);
      dist[k] = 0; prev[k] = null;
      pq.push({ k: k, sid: sa, f: f, d: 0 });
    });
    var found = null;
    while (pq.length) {
      pq.sort(function (x, y) { return x.d - y.d; });
      var cur = pq.shift();
      if (visited[cur.k]) continue;
      visited[cur.k] = true;
      if (cur.sid === sb) { found = cur; break; }
      (EDGES[cur.sid] || []).forEach(function (to) {
        var f = FAM_BY_EDGE[cur.sid + '|' + to];
        if (f !== cur.f) return;
        var nk = key(to, cur.f);
        var nd = cur.d + 2.5;
        if (nd < (dist[nk] == null ? Infinity : dist[nk])) {
          dist[nk] = nd; prev[nk] = cur.k;
          pq.push({ k: nk, sid: to, f: cur.f, d: nd });
        }
      });
      (FAM_AT[cur.sid] || []).forEach(function (f2) {
        if (f2 === cur.f) return;
        var nk = key(cur.sid, f2);
        var nd = cur.d + 6;
        if (nd < (dist[nk] == null ? Infinity : dist[nk])) {
          dist[nk] = nd; prev[nk] = cur.k;
          pq.push({ k: nk, sid: cur.sid, f: f2, d: nd });
        }
      });
    }
    if (!found) { out.ok = false; return out; }
    var steps = [];
    var ck = found.k;
    while (ck) {
      var parts = ck.split('|');
      steps.push({ sid: parts[0], f: parts[1] });
      ck = prev[ck];
    }
    steps.reverse();
    out.minutes = found.d;
    var seq = [];
    steps.forEach(function (st) {
      if (seq.length && seq[seq.length - 1].sid === st.sid) return;
      seq.push(st);
    });
    out.via = seq;
    var curF = null, fcount = 0;
    seq.forEach(function (st) {
      if (st.f !== curF) {
        if (curF !== null) {
          out.famSeq.push({ fam: curF, count: fcount });
          out.transfers++;
        }
        curF = st.f; fcount = 1;
      } else {
        fcount++;
      }
      out.stations.push(st.sid);
      if (!STATIONS[st.sid].climate) out.allClimate = false;
    });
    if (curF !== null) out.famSeq.push({ fam: curF, count: fcount });
    return out;
  }

  /* 站点坐标（由 Photon 地理编码生成，约略值，仅用于"出发地址 → 最近地铁站"匹配） */
  var STATION_COORDS = {"cheongnyangni":[37.5805961,127.0482573],"jegi":[37.5783784,127.0344672],"sinseoldong":[37.5760544,127.0246657],"dongmyo":[37.5735084,127.0174344],"dongdaemun":[37.5718616,127.0114887],"jongno5ga":[37.5709867,127.0020222],"jongno3ga":[37.5704405,126.9923242],"jonggak":[37.5701745,126.9831831],"cityhall":[37.5654798,126.977114],"seoulstation":[37.5534363,126.9697994],"namyeong":[37.5416287,126.9708137],"yongsan":[37.5290767,126.9658972],"noryangjin":[37.5137277,126.9419465],"daebang":[37.512505,126.9260902],"singil":[37.5175712,126.9165959],"yeongdeungpo":[37.5168407,126.9074712],"sindorim":[37.5089178,126.8916525],"guro":[37.5030076,126.8798111],"guil":[37.4963802,126.8708946],"gocheok":[37.5023851,126.8628501],"gaebong":[37.4950928,126.8588262],"oryudong":[37.4956892,126.8431679],"yeokgok":[37.4852186,126.8118113],"bucheon":[37.4848214,126.7828604],"euljiro1":[37.56739,126.98243],"euljiro3":[37.5665588,126.9924393],"euljiro4":[37.5660515,126.9979858],"dongdaemunhdc":[37.5643082,127.0064774],"sindang":[37.56535,127.01622],"sangwangsimni":[37.5643438,127.0291178],"wangsimni":[37.5599826,127.0361846],"hanyangdae":[37.5565796,127.0433579],"ttukseom":[37.5485611,127.0450058],"seongsu":[37.54541,127.05359],"geondae":[37.54088,127.06812],"guui":[37.538097,127.08902],"gangbyeon":[37.535017,127.0934249],"jamsil":[37.5127453,127.0973401],"jamsilsaenae":[37.511759,127.087271],"jonghapundong":[35.1909453,129.066628],"samseong":[37.5088402,127.063143],"seolleung":[37.505447,127.051217],"yeoksam":[37.501657,127.0362961],"gangnam":[37.4975555,127.0268078],"gyodae":[35.1946862,129.0801366],"seocho":[37.4905396,127.0081635],"bangbae":[37.4811668,126.9975891],"sadang":[37.4788878,126.9819332],"nakseongdae":[37.4770819,126.9618621],"seouldaeipgu":[37.485954,126.9572851],"bongcheon":[37.4819925,126.9441047],"sinrim":[37.217061,128.089894],"sindaebang":[37.4874101,126.9128721],"gurodigital":[37.4841252,126.9024807],"daerim":[37.4908703,126.8936859],"munrae":[37.5190228,126.8950065],"yeongdeungpogu":[37.5246353,126.8962174],"dangsan":[37.5348436,126.9026347],"hapjeong":[37.5494073,126.9137028],"hongdae":[37.5568928,126.9240424],"sinchon":[37.5547792,126.9361004],"idae":[37.556591,126.9461899],"ahyeon":[37.5572265,126.9568164],"chungjeongno":[37.5596747,126.9624667],"yongdap":[37.56209,127.0508609],"dorimcheon":[37.51424,126.882874],"yangcheongucheong":[37.51223,126.86436],"sinjeongnegeori":[37.5211295,126.8525027],"kkachisan":[37.5319135,126.8466796],"gyeongbokgung":[37.5758187,126.9718282],"anguk":[37.5762405,126.9861603],"chungmuro":[37.5614471,126.9931107],"dongdaeipgu":[37.5593758,127.0060272],"yaksu":[37.5547911,127.0106133],"geumho":[37.548238,127.015669],"oksu":[37.5407675,127.0191526],"apgujeong":[37.5271225,127.028717],"sinsa":[37.516154,127.0196291],"jamwon":[37.5130042,127.0114648],"expresse":[37.5050371,127.0049222],"nambu":[37.485672,127.0159226],"yangjae":[37.4838155,127.0346881],"maebong":[37.4860153,127.0449216],"dogok":[37.491928,127.056969],"myeongdong":[37.5562113,126.9856939],"hoehyeon":[37.55772,126.97671],"sukdaeeipgu":[37.5438552,126.9722637],"samgakji":[37.5356461,126.9738539],"sinyongsan":[37.5300338,126.9676784],"ichon":[37.5223012,126.9739562],"dongjak":[37.5031891,126.97715],"chongsin":[37.4882466,126.9822846],"isu":[37.4865928,126.9820061],"banghwa":[37.57864,126.8132],"gaehwasan":[37.5727313,126.8074181],"gimpogonghang":[37.5617187,126.8040606],"balsan":[37.5586426,126.8373914],"hwagok":[37.5416488,126.8404293],"sinjeong":[37.5250054,126.8548692],"mokdong":[37.5248782,126.8647115],"omokgyo":[37.5244192,126.8760954],"yangpyeong":[37.4928474,127.4918972],"yeongdeungposijang":[37.5234146,126.9054031],"yeouido":[37.5216685,126.9243018],"yeouinaru":[37.5268526,126.9325288],"mapo":[37.54072,126.94707],"gongdeok":[37.54439,126.9531],"aegae":[37.5531031,126.9566765],"seodaemun":[37.5663949,126.9660369],"gwanghwamun":[37.5701729,126.9765911],"cheonggu":[37.5602449,127.0137974],"singeumho":[37.5562,127.0198778],"haengdang":[37.55705,127.02872],"majang":[37.56542,127.04173],"dapsimni":[37.5667506,127.0531606],"janghanpyeong":[37.56241,127.06538],"gunja":[37.5570888,127.0794562],"achasan":[37.551052,127.090439],"gwangnaru":[37.5452374,127.1037153],"cheonho":[37.53595,127.12271],"gangdong":[37.5362701,127.1324692],"gildong":[37.5376,127.14006],"gulbeundari":[37.5454063,127.1426773],"myeongil":[37.55213,127.14392],"godeok":[37.5553529,127.1558802],"sangildong":[37.5565983,127.1654768],"gangil":[37.557072,127.17514],"misa":[37.5637063,127.1928436],"dunchon":[37.5282345,127.1361829],"olympicpark":[37.5163484,127.1313146],"bangi":[37.5088199,127.1264659],"ogeum":[37.5016518,127.1281815],"digiteol":[37.5784624,126.9011968],"worldcup":[36.3688733,127.317719],"mapocheong":[37.5609093,126.9054947],"mangwon":[37.5549507,126.9108353],"sangsu":[37.54776,126.92297],"gwangheungchang":[37.5474724,126.9314815],"daeheung":[37.54751,126.94294],"hyochang":[37.5392201,126.9613674],"noksapyeong":[37.5347582,126.9853046],"itaewon":[37.5345026,126.9943705],"hanggangjin":[37.541153,127.0022125],"beotigogae":[37.5475895,127.0050399],"changsin":[37.5793343,127.0150833],"bomon":[37.5857543,127.0190003],"anam":[37.5862886,127.0293703],"korea":[37.58857,127.03669],"wolgok":[37.6028682,127.0421954],"sangwolgok":[37.60592,127.04728],"dolgoji":[37.6113129,127.0575943],"seokgye":[37.61369,127.06537],"taereung":[37.6176684,127.0755607],"hwarangdae":[37.6197841,127.0837122],"bonghwasan":[37.6174165,127.0910968],"sinnae":[37.6126059,127.1033244],"myeonmok":[37.5883097,127.087201],"sagajeong":[37.5806574,127.0884624],"yongmasan":[37.57348,127.08634],"junggok":[37.5656586,127.0842972],"eorini":[37.5472339,127.0741928],"jayang":[37.5335691,127.0678499],"ttukseomyuwonji":[37.5300819,127.0658433],"cheongdam":[37.5197372,127.0576782],"gangnamgucheong":[37.5184784,127.0406794],"hakdong":[37.5148043,127.030361],"nonhyeon":[37.4007775,126.721655],"banpo":[37.5082393,127.0123719],"naebang":[37.4869395,126.9942682],"namseong":[37.4849121,126.9706264],"sungseoldae":[37.4963707,126.9537214],"sangdo":[37.5038459,126.9490029],"jangseungbaegi":[37.5058518,126.9393616],"sindaebangsamgeori":[37.4998525,126.9282063],"boramae":[37.49972,126.91972],"sinpung":[37.5002556,126.9121552],"namguro":[37.4855334,126.8868836],"gasan":[37.480819,126.8816358],"mongchontoseong":[37.5185895,127.1131442],"songpa":[37.4999551,127.1121973],"garaksijang":[37.4925756,127.1188213],"munjeong":[37.4875119,127.1214398],"jangji":[37.47741,127.12644],"bokjeong":[37.4701427,127.1256486],"gaehwa":[37.5781728,126.7981557],"airportsijang":[37.5638733,126.8106079],"sinbanghwa":[37.5674057,126.8162155],"magongnaru":[37.5668515,126.8255715],"yangcheonhyanggyo":[37.5684941,126.8412729],"gayang":[37.5603756,126.8565358],"jeungmi":[37.5567132,126.8633978],"deungchon":[37.5515696,126.8639628],"yeomchang":[37.5467096,126.8734557],"sinmokdong":[37.5443314,126.8832109],"seonyudo":[37.5384598,126.8945084],"gukhoe":[37.5281639,126.9170227],"saetgang":[37.5177651,126.9284134],"nodle":[37.5129128,126.9488893],"heukseok":[37.5093803,126.9636154],"gubanpo":[37.5017383,126.9890611],"sinbanpo":[37.5034804,126.9965534],"sapyeong":[37.5038115,127.0158093],"sinnonhyeon":[37.5009805,127.026448],"eonju":[37.506367,127.034523],"seonjeongneung":[37.5097847,127.0427704],"samseongjungang":[37.5129623,127.0538635],"bongeunsa":[37.5148189,127.0631244],"samjeon":[37.5039041,127.0890027],"seokchongobun":[37.502338,127.096443],"seokchon":[37.5055046,127.106575],"songpanaru":[37.5096527,127.1130858],"hanseongbaekje":[37.516659,127.116257],"dunchonoryun":[37.518692,127.139061],"jungangbohun":[37.527794,127.147644],"seoulsup":[37.5437305,127.0451884],"apgujeongrodeo":[37.5274544,127.0404282],"hanti":[37.498116,127.0521475],"guryong":[37.4860703,127.0593762],"gaepodong":[37.4889678,127.0654139],"daemosan":[37.491435,127.0728795],"suseo":[37.488737,127.0998954],"seogang":[37.5524922,126.9349731],"gajwa":[37.5679436,126.9152514]};

  /* 查找距离给定经纬度最近的地铁站 */
  function nearestStation(lat, lng) {
    var best = null, bestD = Infinity;
    Object.keys(STATION_COORDS).forEach(function (id) {
      var c = STATION_COORDS[id];
      if (!c) return;
      var dLat = c[0] - lat;
      var dLng = (c[1] - lng) * Math.cos(lat * Math.PI / 180);
      var d = dLat * dLat + dLng * dLng;
      if (d < bestD) { bestD = d; best = id; }
    });
    return best;
  }

  return {
    stations: STATIONS,
    lines: LN,
    stationCoords: STATION_COORDS,
    nearestStation: nearestStation,
    resolveStation: resolveStation,
    routeBetween: routeBetween,
    famName: famName,
    famColor: famColor,
    PER_EDGE_MIN: 2.5,
    TRANSFER_MIN: 6
  };
})();
