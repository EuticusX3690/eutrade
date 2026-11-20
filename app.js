/* Eutrade app logic: calculator, journal, stats, coach. */
var side = "buy";
function $(id){return document.getElementById(id)}
function num(id){var v=parseFloat(String($(id).value).replace(",","."));return isNaN(v)?null:v}

function setSide(s){
  side = s;
  $("buy").classList.toggle("on", s==="buy");
  $("sell").classList.toggle("on", s==="sell");
  $("levelLbl").textContent = s==="buy" ? "Support price" : "Resistance price";
  $("nxtLbl").textContent = s==="buy" ? "Next resistance in the way (optional)" : "Next support in the way (optional)";
  calc();
}

var SPREAD={EURUSD:1,GBPUSD:1.2,AUDUSD:1.2,NZDUSD:1.5,USDJPY:1.2,USDCHF:1.5,USDCAD:1.5,XAUUSD:3,EURJPY:1.8,GBPJPY:2.5,EURGBP:1.5};
function calc(){
  last = null;
  $("lots").placeholder = "auto";
  var pair = $("pair").value;
  var entry = num("entry"), level = num("level"), buf = num("buf"), rr = num("rr"), lots = num("lots");
  var bal = num("bal"), rp = num("rp"), nxt = num("nxt"), atr = num("atr");
  var sprIn = num("spr"), sprAuto = (sprIn===null || sprIn<0);
  var spr = sprAuto ? (SPREAD[pair]||1.5) : sprIn;
  $("spr").placeholder = (SPREAD[pair]||1.5) + " (typical)";
  var isJPY = pair.slice(-3)==="JPY";
  var pip = pair==="XAUUSD" ? 0.1 : (isJPY ? 0.01 : 0.0001);
  var dec = pair==="XAUUSD" ? 2 : (isJPY ? 3 : 5);
  var needsInput = !(pair==="XAUUSD" || pair.slice(-3)==="USD" || pair.slice(0,3)==="USD");
  $("pv").style.display = needsInput ? "block" : "none";
  var ids = ["rSL","rPips","rTP","rRR","rLots","rPerLot","rSpr","rRisk","rWin"];
  function clear(msg){ids.forEach(function(i){$(i).textContent="\u2013"}); $("hint").textContent=msg; $("warn").textContent="";}

  var ownSL=num("ownsl"), ownTP=num("owntp");
  var needSL=(ownSL===null), needTP=(ownTP===null);
  if(entry===null || (needSL && (level===null || buf===null || buf<0)) || (needTP && (rr===null || rr<=0))){clear("Fill in the boxes above and the answers appear here.");return}
  var slP = needSL ? (side==="buy" ? level-buf*pip : level+buf*pip) : ownSL;
  var wrong = side==="buy" ? slP>=entry : slP<=entry;
  if(wrong){clear(needSL ? (side==="buy" ? "For a buy, support must be below your entry." : "For a sell, resistance must be above your entry.") : (side==="buy" ? "For a buy, your own SL must be below your entry." : "For a sell, your own SL must be above your entry."));return}

  var sl = Math.abs(entry-slP)/pip;
  var tpP, tpPips;
  if(needTP){
    tpPips = sl*rr;
    tpP = side==="buy" ? entry+tpPips*pip : entry-tpPips*pip;
  } else {
    tpP = ownTP;
    if(side==="buy" ? tpP<=entry : tpP>=entry){clear(side==="buy" ? "For a buy, your own TP must be above your entry." : "For a sell, your own TP must be below your entry.");return}
    tpPips = Math.abs(tpP-entry)/pip;
    rr = Math.round(tpPips/sl*100)/100;
  }
  var slEff = sl+spr, tpEff = tpPips-spr, rrEff = tpEff/slEff;
  $("rSL").textContent = slP.toFixed(dec);
  $("rPips").textContent = sl.toFixed(1) + " pips";
  $("rTP").textContent = tpP.toFixed(dec);
  $("rRR").textContent = "1 : " + rr + (spr>0 ? " (" + rrEff.toFixed(2) + " after spread)" : "");

  var w=[];
  if(spr>0) w.push("After spread ("+spr+" pips"+(sprAuto?", typical for this pair":"")+"), your real ratio is 1:"+rrEff.toFixed(2)+".");
  if(nxt!==null){
    var room = side==="buy" ? nxt-entry : entry-nxt;
    if(room<=0){ w.push("The next level should be "+(side==="buy"?"above":"below")+" your entry."); }
    else{
      var maxRR=(room/pip)/sl;
      var past = side==="buy" ? tpP>nxt : tpP<nxt;
      if(past) w.push("Warning: your TP is past the next level. Price has room for only 1:"+maxRR.toFixed(2)+" before it.");
      else w.push("Good: your TP is before the next level.");
    }
  }
  if(atr!==null && atr>0 && buf!==null){ var ap=atr/pip; w.push("ATR is "+ap.toFixed(1)+" pips. Your buffer is "+(buf/ap).toFixed(1)+"x ATR."); }
  $("warn").textContent = w.join("\n");

  var pipValue;
  if(pair==="XAUUSD" || pair.slice(-3)==="USD"){ pipValue = 10; }
  else if(pair.slice(0,3)==="USD"){ pipValue = (pip*100000)/entry; }
  else { pipValue = num("pipval"); }
  function noMoney(msg){["rLots","rPerLot","rSpr","rRisk","rWin"].forEach(function(i){$(i).textContent="\u2013"}); $("hint").textContent=msg;}
  if(pipValue===null || isNaN(pipValue) || pipValue<=0){noMoney("Type the pip value to see the money.");return}

  var note="", lotsLabel;
  if(lots===null){
    if(bal===null || rp===null || bal<=0 || rp<=0){noMoney("Type your balance and risk %, or type a lot size.");return}
    lots = Math.floor(((bal*rp/100)/(slEff*pipValue))*100)/100;
    if(lots<0.01){lots=0.01; note=" Even the smallest lot (0.01) risks more than your "+rp+"%.";}
    lotsLabel = lots.toFixed(2)+" (auto)";
    $("lots").placeholder = lots.toFixed(2)+" (auto)";
  } else { lotsLabel = lots.toFixed(2); }

  var risk = slEff*pipValue*lots, win = tpEff*pipValue*lots;
  $("rLots").textContent = lotsLabel;
  $("rPerLot").textContent = "$" + (slEff*pipValue).toFixed(2);
  $("rSpr").textContent = spr + " pips" + (sprAuto ? " (typical)" : "");
  $("rRisk").textContent = "$" + risk.toFixed(2);
  $("rWin").textContent = (win<0?"-":"") + "$" + Math.abs(win).toFixed(2);
  var pct = (bal!==null && bal>0) ? "You risk "+(risk/bal*100).toFixed(2)+"% of your balance. " : "";
  $("hint").textContent = pct + "TP is " + tpPips.toFixed(1) + " pips from your entry." + note;
  last = {pair:pair, side:side, entry:entry, sl:slP.toFixed(dec), tp:tpP.toFixed(dec), pips:sl.toFixed(1), rr:rr, risk:risk, win:win, lots:lots, spread:spr, bal:bal, perLot:slEff*pipValue, custom:((!needSL&&!needTP)?"SL and TP":(!needSL?"SL":(!needTP?"TP":"")))};
}

$("buy").onclick = function(){setSide("buy")};
$("sell").onclick = function(){setSide("sell")};
["pair","entry","level","buf","rr","lots","pipval","bal","rp","nxt","spr","atr","ownsl","owntp"].forEach(function(i){
  $(i).addEventListener("input", calc);
  $(i).addEventListener("change", calc);
});
var last=null, trades=[], closing=null, delId=null, KEY="mwendas_journal_v1";
try{var s0=localStorage.getItem(KEY); if(s0) trades=JSON.parse(s0)||[];}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(trades))}catch(e){$("saveMsg").textContent="Couldn’t save on this browser."}}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
function btn(txt,cls,fn){var b=el("button",cls,txt);b.type="button";b.onclick=fn;return b}
var LABEL={won:"Won",lost:"Lost",out:"Pulled out",open:"Open"};
var TREND={up:"Up trend",down:"Down trend",side:"Sideways"};
function hr(ms,tz){return parseInt(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",hour12:false,timeZone:tz}).format(new Date(ms)),10)%24}
function sessionOf(ms){
  try{
    var s=[], sy=hr(ms,"Australia/Sydney"), tk=hr(ms,"Asia/Tokyo"), lo=hr(ms,"Europe/London"), ny=hr(ms,"America/New_York");
    if(sy>=7&&sy<16)s.push("Sydney");
    if(tk>=9&&tk<18)s.push("Asia");
    if(lo>=8&&lo<17)s.push("London");
    if(ny>=8&&ny<17)s.push("New York");
    return s.length?s.join(" + "):"Quiet hours";
  }catch(e){return "Unknown"}
}
var dbp=null; var jf="all", jShown=10, sf="all";
function idb(){
  if(!dbp) dbp=new Promise(function(res,rej){
    try{var r=indexedDB.open("mwendas_shots",1);
      r.onupgradeneeded=function(){r.result.createObjectStore("s")};
      r.onsuccess=function(){res(r.result)}; r.onerror=function(){rej(r.error)};
    }catch(e){rej(e)}
  });
  return dbp;
}
function putShots(id,arr){return idb().then(function(d){return new Promise(function(res,rej){var tx=d.transaction("s","readwrite");tx.objectStore("s").put(arr,id);tx.oncomplete=res;tx.onerror=function(){rej(tx.error)}})})}
function getShots(id){return idb().then(function(d){return new Promise(function(res,rej){var q=d.transaction("s","readonly").objectStore("s").get(id);q.onsuccess=function(){res(q.result||[])};q.onerror=function(){rej(q.error)}})})}
function delShots(id){return idb().then(function(d){return new Promise(function(res){var tx=d.transaction("s","readwrite");tx.objectStore("s").delete(id);tx.oncomplete=res;tx.onerror=res})}).catch(function(){})}
function shrink(file){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){var s=Math.min(1,1200/Math.max(im.width,im.height));var c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",0.75))};im.onerror=rej;im.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
function oa(t){return typeof t.openedAt==="number"?t.openedAt:t.id}
function plOf(t){return t.outcome==="won"?t.win:(t.outcome==="lost"?-t.risk:(typeof t.pl==="number"?t.pl:0))}
function money(p){return (p>=0?"+":"-")+"$"+Math.abs(p).toFixed(2)}
function dur(ms){var m=Math.round(ms/60000); if(m<1)return "under 1 min"; if(m<60)return m+" min"; var h=Math.floor(m/60), r=m%60; if(h<24)return h+"h "+r+"m"; return Math.floor(h/24)+"d "+(h%24)+"h"}
function tm(ms){return new Date(ms).toLocaleString([],{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}

var coachBusy={}, coachErr={}, coachOpen={}, editId=null;
var KIND={before:"Before entry",entry:"At entry",after:"After entry",close:"At close"};
function normShot(x){return typeof x==="string"?{u:x,k:"entry"}:x}
function suggestName(text){
  var m=/Strategy name\s*:\s*CHANGE TO\s+([^\n]+)/i.exec(String(text||""));
  if(!m) return null;
  var n=m[1].replace(/["'.*\u201c\u201d]+/g,"").trim();
  return (n && n.length<=40)?n:null;
}
function fillCoach(box,text){
  box.textContent="";
  var re=/(Chart check|Done right|Could improve|Rule for next trade|Strategy name)\s*:/gi, m, idx=[];
  while((m=re.exec(text))!==null) idx.push({k:m[1].toLowerCase(),s:m.index,e:re.lastIndex});
  if(!idx.length){box.textContent=text;return}
  var cls={"chart check":"cc","done right":"dr","could improve":"ci","rule for next trade":"rn","strategy name":"sn"};
  idx.forEach(function(x,i){
    var body=text.slice(x.e, i+1<idx.length?idx[i+1].s:text.length).trim();
    var sec=el("div","cs "+cls[x.k]);
    sec.appendChild(el("b","",x.k.charAt(0).toUpperCase()+x.k.slice(1)));
    body.split("\n").forEach(function(line){
      if(!line.trim())return;
      var d=el("div","cl");
      line.split(/(Not confirmed|Confirmed|Cannot tell)/i).forEach(function(part){
        if(!part)return;
        var l=part.toLowerCase();
        if(l==="not confirmed") d.appendChild(el("span","kn",part));
        else if(l==="confirmed") d.appendChild(el("span","kc",part));
        else if(l==="cannot tell") d.appendChild(el("span","kt",part));
        else d.appendChild(document.createTextNode(part));
      });
      sec.appendChild(d);
    });
    box.appendChild(sec);
  });
}
function d2b(u){var p=u.split(","),m=p[0].match(/:(.*?);/)[1],b=atob(p[1]),n=b.length,a=new Uint8Array(n);while(n--)a[n]=b.charCodeAt(n);return new Blob([a],{type:m})}
function checksFor(t){
  var r=[];
  if(t.trend==="up"||t.trend==="down"){
    var withT=(t.side==="buy"&&t.trend==="up")||(t.side==="sell"&&t.trend==="down");
    r.push({ok:withT,text:withT?"You traded with the trend.":"You traded against the trend."});
  } else if(t.trend==="side"){ r.push({ok:true,text:"Sideways market: bounces suit it, but be ready for a breakout."}); }
  if(!t.trend) r.push({ok:false,text:"You have not set the market trend yet."});
  if(sessionOf(oa(t))==="Quiet hours") r.push({ok:false,text:"You traded in quiet hours, when price moves slowly."});
  if(typeof t.rr==="number") r.push({ok:t.rr>=2,text:t.rr>=2?"Planned ratio 1:"+t.rr+" is good.":"Planned ratio 1:"+t.rr+" is below 1:2."});
  if(typeof t.bal==="number" && t.bal>0 && typeof t.risk==="number"){
    var rp=t.risk/t.bal*100;
    r.push({ok:rp<=2,text:"You risked "+rp.toFixed(1)+"% of your balance"+(rp<=2?".":", which is high. Many traders keep it at 1 to 2%.")});
  }
  var okR=!!(t.reason && t.reason.length>=10);
  r.push({ok:okR,text:okR?"You wrote a reason for entering.":"Your reason for entering is missing or too short."});
  if(t.outcome==="out") r.push({ok:!!t.note,text:t.note?"You explained why you pulled out.":"You did not explain why you pulled out."});
  if(t.outcome==="lost" && typeof t.closed==="number" && t.closed-oa(t)<300000) r.push({ok:false,text:"The trade lost in under 5 minutes. Was the entry too early?"});
  if(!(t.shots>0)) r.push({ok:false,text:"No screenshot saved. Add one next time for your data."});
  return r;
}
function judgeRules(t){
  var jpy=t.pair.slice(-3)==="JPY", ps=t.pair==="XAUUSD"?0.1:(jpy?0.01:0.0001);
  var z10=(10*ps).toFixed(jpy||t.pair==="XAUUSD"?2:4), z20=(20*ps).toFixed(jpy||t.pair==="XAUUSD"?2:4);
  var times="Trade saved in the app at (phone time): "+tm(oa(t))+(typeof t.closed==="number"?". Trade closed at (phone time): "+tm(t.closed):"")+".";
  var seenN={}, nmL=[]; trades.forEach(function(x){var k=x.strategy.toLowerCase(); if(!seenN[k]){seenN[k]=1; nmL.push(x.strategy)}});
  return "\nJudging rules:\n"+
  "1) Support and resistance are ZONES, not one exact price. An entry within about 10 pips ("+z10+" in price) of a visible line counts as at the line. Between 10 and 20 pips ("+z20+") say it was a little early or late. Only say it was not at the level if it is clearly more than 20 pips away. Real candles often react a few pips before or after the line.\n"+
  "2) Use the clocks in each screenshot (the phone clock at the top and the time axis of the chart) to work out when it was taken. "+times+" Only say a screenshot was taken after the trade if the clocks clearly show that. If you cannot read the clock, say Cannot tell about timing.\n"+
  "3) Sessions: the Asia (Tokyo) and Sydney sessions are active times for JPY, AUD and NZD pairs, including USDJPY. Never call Asia or Sydney slow or random for those pairs. For EUR, GBP and CHF pairs, London and New York are the most active. Only warn about Quiet hours when the session is Quiet hours.\n"+
  "4) Strategy name check: the trader named this trade \""+t.strategy+"\". Compare that name with the reason and with what the chart shows. If it clearly does not match what the trader really did (for example the name says resistance bounce but the entry was a moving average rejection), suggest a better name. Strategy names the trader already uses: "+nmL.join(", ")+". If one of them fits, use that exact name. Otherwise use a short simple name of 2 to 3 words. If the name is fine, or you are not sure, keep it.\n";
}
function buildPrompt(t,desc){
  var hist=trades.filter(function(x){return x.id!==t.id && x.outcome!=="open" && x.strategy.toLowerCase()===t.strategy.toLowerCase()});
  var w=hist.filter(function(x){return x.outcome==="won"}).length;
  var last5=hist.slice(0,5).map(function(x){return LABEL[x.outcome]}).join(", ")||"none yet";
  var ck=checksFor(t).map(function(x){return (x.ok?"OK: ":"WARNING: ")+x.text}).join("\n");
  return "You are a calm, honest trading coach for Euticus, a beginner forex trader who is a slow learner. Use very simple English and short sentences.\n\nThe trade just ended. Review it.\n\n"+
  "Pair: "+t.pair+" "+t.side.toUpperCase()+"\nStrategy: "+t.strategy+"\nTrend chosen by the trader: "+(TREND[t.trend]||"not set")+"\nSession: "+sessionOf(oa(t))+
  "\nPlanned entry "+t.entry+", SL "+t.sl+", TP "+t.tp+" (planned 1:"+t.rr+")"+(t.custom?". The trader set the "+t.custom+" manually instead of using the buffer and fixed ratio method":"")+"\nLot size: "+(t.lots||"unknown")+
  "\nResult: "+LABEL[t.outcome]+", "+money(plOf(t))+(typeof t.closed==="number"?", lasted "+dur(t.closed-oa(t)):"")+
  "\nWhy the trader entered: "+(t.reason||"(not written)")+"\nTrader note at close: "+(t.note||"(none)")+
  "\nAutomatic checks:\n"+(ck||"none")+
  "\nSame strategy before this trade: "+hist.length+" closed trades, "+w+" won. Last results: "+last5+".\n"+
  (desc&&desc.length?("Screenshots attached, in this order: "+desc.map(function(d,i){return (i+1)+") "+d}).join(", ")+". The pictures may not be from the exact moment of entry, and the real MT5 entry price can differ a little from the planned entry above. Judge the SETUP (trend, support or resistance, candle shapes), not exact prices. Only comment on what you can clearly see, and say if you are unsure.\nYour first job is a CHART CHECK: compare what the trader wrote (the reason for entry, the trend, the strategy, and buy or sell) with what is really visible in the screenshots. For each claim write Confirmed, Not confirmed, or Cannot tell, with one short reason. Say Not confirmed only if the chart clearly shows something different. Say Cannot tell if the picture is unclear or if the timing of the picture makes the claim impossible to judge. If there is an At close picture, also say briefly how the trade played out. Do not agree just to be nice.\n"):"No screenshot is attached, so in the Chart check part say that you cannot verify the chart claims.\n")+
  judgeRules(t)+"\nReply in plain text with no markdown symbols, maximum 200 words, in exactly 5 parts:\nChart check: ...\nDone right: ...\nCould improve: ...\nRule for next trade: ...\nStrategy name: write CORRECT, or write CHANGE TO followed by the new name, and nothing else on that line\nBe honest. A loss can still be a good trade if the rules were followed, and a win can be a bad trade if the rules were broken. Do not promise profits.\nImportant wording: never use the words bullish or bearish. Say buyers candle instead of bullish candle, and sellers candle instead of bearish candle. Say buyers are in control or sellers are in control when talking about market direction.";
}
function plain(x){return String(x||"").replace(/bullish/gi,function(m){return m[0]==="B"?"Buyers":"buyers"}).replace(/bearish/gi,function(m){return m[0]==="B"?"Sellers":"sellers"})}
function saveDetails(t,trS,rsT,mnI,flI,kdS,msE){
  t.trend=trS.value; t.reason=rsT.value.trim();
  var m=parseFloat(String(mnI.value).replace(",","."));
  if(!isNaN(m)) t.openedAt=t.id-Math.round(m*60000);
  var files=Array.prototype.slice.call(flI.files||[]), kind=kdS.value;
  persist();
  if(!files.length){editId=null; render(); return}
  msE.textContent="Saving screenshots...";
  Promise.all(files.map(shrink)).then(function(arr){
    return getShots(t.id).catch(function(){return []}).then(function(old){
      var all=old.map(normShot).concat(arr.map(function(u){return {u:u,k:kind}}));
      return putShots(t.id,all).then(function(){t.shots=all.length; persist(); editId=null; render()});
    });
  }).catch(function(){msE.textContent="Could not store the screenshots on this browser."});
}
function setCoachEl(id){var e=document.getElementById("coach-"+id); if(e) fillCoach(e, coachBusy[id]||"")}
/* ---------- AI layer ----------
   Three ways to reach the AI:
   1) "runtime": built in when the app runs inside Claude
   2) "api":     your own Anthropic API key, kept only in this browser
   3) "copy":    no key, so the app copies the prompt for you to paste into Claude */
var AI_KEY="eutrade_apikey", AI_MODEL="eutrade_model", DEFAULT_MODEL="claude-sonnet-5-5";
function getKey(){try{return localStorage.getItem(AI_KEY)||""}catch(e){return ""}}
function getModel(){try{return localStorage.getItem(AI_MODEL)||DEFAULT_MODEL}catch(e){return DEFAULT_MODEL}}
function aiMode(){
  if(typeof claude!=="undefined" && claude.use) return "runtime";
  return getKey() ? "api" : "copy";
}
function shotLabel(x){return KIND[x.k]||"Screenshot"}
function copyText(text){
  return new Promise(function(res){
    function fallback(){
      var ta=document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select();
      try{document.execCommand("copy")}catch(e){}
      ta.remove(); res();
    }
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(res,fallback)}
      else fallback();
    }catch(e){fallback()}
  });
}
function pickShots(t){
  if(!t || !(t.shots>0)) return Promise.resolve([]);
  return getShots(t.id).catch(function(){return []}).then(function(arr){
    var sh=arr.map(normShot), pick=[];
    function first(k){return sh.filter(function(x){return x.k===k})[0]}
    var a1=first("entry")||first("before")||first("after"), b1=first("close");
    if(a1)pick.push(a1); if(b1&&b1!==a1)pick.push(b1);
    if(!pick.length&&sh[0])pick.push(sh[0]);
    return pick;
  });
}
function runtimeRun(buildFn,pick,onText){
  return claude.use("sample").then(function(sample){
    if(!sample) throw {code:"not_declared"};
    return Promise.resolve(sample.limits?sample.limits():{}).catch(function(){return {}}).then(function(lim){
      var list=(lim && lim.images)?pick:[];
      function run(l){
        var o2={onText:onText}, desc=[];
        try{ if(l.length){o2.images=l.map(function(x){return d2b(x.u)}); desc=l.map(shotLabel)} }catch(e){delete o2.images; desc=[]}
        return sample(buildFn(desc),o2);
      }
      return run(list).catch(function(e){ if(list.length>1) return run([list[0]]); throw e; });
    });
  });
}
function apiRun(buildFn,pick){
  var key=getKey(), model=getModel();
  function call(list){
    var content=[];
    list.forEach(function(x){
      var p=x.u.split(","), mt=(p[0].match(/:(.*?);/)||[])[1]||"image/jpeg";
      content.push({type:"image",source:{type:"base64",media_type:mt,data:p[1]}});
    });
    content.push({type:"text",text:buildFn(list.map(shotLabel))});
    return fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:model,max_tokens:900,messages:[{role:"user",content:content}]})
    }).then(function(r){
      return r.json().then(function(j){
        if(!r.ok) throw {code:(r.status===401?"bad_key":(r.status===429?"rate_limited":"api_error")),message:(j&&j.error&&j.error.message)||""};
        return {text:(j.content||[]).map(function(b){return b.text||""}).join("")};
      });
    });
  }
  return call(pick).catch(function(e){ if(pick.length>1 && e && e.code==="api_error") return call([pick[0]]); throw e; });
}
function aiCall(t,buildFn,onText){
  var mode=aiMode();
  return pickShots(t).then(function(pick){
    if(mode==="copy"){
      var desc=pick.map(shotLabel);
      return copyText(buildFn(desc)).then(function(){
        try{window.open("https://claude.ai/new","_blank")}catch(e){}
        return {copied:true,desc:desc};
      });
    }
    return mode==="api" ? apiRun(buildFn,pick) : runtimeRun(buildFn,pick,onText);
  });
}
function aiErrText(e){
  var c=e && e.code;
  if(c==="bad_key") return "Your API key was refused. Check it in More, under AI settings.";
  if(c==="rate_limited") return "Too many requests. Try again in a while.";
  if(c==="not_granted"||c==="sampling_disabled"||c==="not_declared"||c==="capability_disabled") return "Coach feedback is switched off for this app.";
  if(e instanceof TypeError) return "Could not reach the AI. Check your internet.";
  if(c==="api_error") return "The AI returned an error"+(e.message?": "+String(e.message).slice(0,140):".");
  return "Could not get feedback. Try again.";
}

/* ---------- Coach after a trade closes ---------- */
function getCoach(t,manual){
  var id=t.id;
  coachOpen[id]=true;
  if(aiMode()==="copy" && !manual){
    coachErr[id]="No AI key is set. Tap Get feedback to copy a prompt, then paste it into Claude.";
    render(); return;
  }
  coachBusy[id]="Thinking..."; render();
  aiCall(t,function(desc){return buildPrompt(t,desc)},function(o){coachBusy[id]=plain(o.text); setCoachEl(id)}).then(function(r){
    delete coachBusy[id];
    if(r.copied){
      coachErr[id]="Prompt copied. Open Claude, paste it"+(r.desc.length?", and attach these screenshots: "+r.desc.join(", "):"")+".";
      render(); return;
    }
    t.coach=plain(r.text); persist(); render();
  }).catch(function(e){ delete coachBusy[id]; coachErr[id]=aiErrText(e); render(); });
}

/* ---------- Ask the AI anything ---------- */
function statsText(){
  var g={}, closed=trades.filter(function(t){return t.outcome!=="open"});
  closed.forEach(function(t){var x=g[t.strategy]||(g[t.strategy]={n:0,w:0,pl:0}); x.n++; if(t.outcome==="won")x.w++; x.pl+=plOf(t)});
  var lines=Object.keys(g).map(function(k){var x=g[k]; return k+": "+x.n+" closed, "+Math.round(x.w/x.n*100)+"% won, total "+money(x.pl)});
  var recent=closed.slice(0,8).map(function(t){return t.pair+" "+t.side+" "+t.strategy+" "+LABEL[t.outcome]+" "+money(plOf(t))+" ("+(TREND[t.trend]||"trend not set")+", "+sessionOf(oa(t))+")"});
  return "Results by strategy:\n"+(lines.join("\n")||"none yet")+"\nRecent closed trades:\n"+(recent.join("\n")||"none yet");
}
function guidancePrompt(q){
  var p="You are a calm, honest trading coach for Euticus, a beginner forex trader who is a slow learner. Use very simple English and short sentences. Never use the words bullish or bearish: say buyers candle, sellers candle, buyers in control or sellers in control. Do not promise profits and do not tell him to risk more. If you need more information, ask one short question. Maximum 180 words.\n\n";
  if($("askCalc").checked && last){
    p+="His current calculation:\nPair "+last.pair+" "+last.side.toUpperCase()+", entry "+last.entry+", SL "+last.sl+", TP "+last.tp+" (1:"+last.rr+"), lot size "+last.lots+", risk $"+last.risk.toFixed(2)+"\n\n";
  }
  if($("askStats").checked) p+=statsText()+"\n\n";
  return p+"His question:\n"+q;
}

function render(){
  var names={}, dl=$("stratList"); dl.textContent="";
  trades.forEach(function(t){var k=t.strategy.toLowerCase(); if(!names[k]){names[k]=1;var o=document.createElement("option");o.value=t.strategy;dl.appendChild(o)}});

  var seen={}, slist=[];
  trades.forEach(function(t){var k=t.strategy.toLowerCase(); if(!seen[k]){seen[k]=1; slist.push([k,t.strategy])}});
  if(sf!=="all" && !seen[sf]) sf="all";
  ["sfS","sfJ"].forEach(function(id){
    var s=$(id); s.textContent="";
    var a=document.createElement("option"); a.value="all"; a.textContent="All strategies"; s.appendChild(a);
    slist.forEach(function(p){var o=document.createElement("option"); o.value=p[0]; o.textContent=p[1]; s.appendChild(o)});
    s.value=sf;
    s.onchange=function(){sf=s.value; jShown=10; render()};
  });
  var tv=trades.filter(function(t){return sf==="all"||t.strategy.toLowerCase()===sf});

  var g={};
  tv.forEach(function(t){
    if(t.outcome==="open")return;
    var k=t.strategy.toLowerCase();
    if(!g[k])g[k]={name:t.strategy,n:0,w:0,l:0,o:0,pl:0,ms:0,tn:0};
    g[k].n++; g[k].pl+=plOf(t);
    if(typeof t.closed==="number"){g[k].ms+=t.closed-oa(t); g[k].tn++}
    if(t.outcome==="won")g[k].w++; else if(t.outcome==="lost")g[k].l++; else g[k].o++;
  });
  var st=$("stats"); st.textContent="";
  var keys=Object.keys(g);
  if(!keys.length){st.appendChild(el("p","hint","Close some trades and your win rate will show here."))}
  keys.forEach(function(k){
    var s=g[k], card=el("div","card");
    card.appendChild(el("div","big2",s.name+": "+Math.round(s.w/s.n*100)+"% wins"));
    card.appendChild(el("div","big2 "+(s.pl>=0?"win":"loss"),"Total: "+money(s.pl)));
    if(s.tn) card.appendChild(el("div","hint","Average trade time: "+dur(s.ms/s.tn)));
    card.appendChild(el("div","hint",s.w+" won, "+s.l+" lost, "+s.o+" pulled out ("+s.n+" closed)"+(s.n<20?". Too few trades to trust yet, aim for 20 or more.":"")));
    st.appendChild(card);
  });
  if(keys.length) st.appendChild(el("p","hint","Pulled out trades count as not won. Total $ = wins minus losses, plus any amount you typed when you pulled out."));

  var tg={};
  tv.forEach(function(t){if(t.outcome==="open"||!t.trend)return; var x=tg[t.trend]||(tg[t.trend]={n:0,w:0}); x.n++; if(t.outcome==="won")x.w++});
  var tk=Object.keys(tg);
  if(tk.length){
    var tc=el("div","card"); tc.appendChild(el("div","big2","Win rate by trend"));
    tk.forEach(function(k){tc.appendChild(el("div","",TREND[k]+": "+Math.round(tg[k].w/tg[k].n*100)+"% ("+tg[k].w+" of "+tg[k].n+")"))});
    st.appendChild(tc);
  }

  var sg={};
  tv.forEach(function(t){if(t.outcome==="open")return; var k=sessionOf(oa(t)); var x=sg[k]||(sg[k]={n:0,w:0}); x.n++; if(t.outcome==="won")x.w++});
  var sk=Object.keys(sg);
  if(sk.length){
    var sc=el("div","card"); sc.appendChild(el("div","big2","Win rate by session"));
    sk.forEach(function(k){sc.appendChild(el("div","",k+": "+Math.round(sg[k].w/sg[k].n*100)+"% ("+sg[k].w+" of "+sg[k].n+")"))});
    st.appendChild(sc);
  }

  var ls=$("list"); ls.textContent="";
  var vis=tv.filter(function(t){return jf==="all"||(jf==="open"?t.outcome==="open":t.outcome!=="open")});
  var fl=$("filters"); fl.textContent="";
  [["all","All"],["open","Open"],["closed","Closed"]].forEach(function(f){
    var cnt=tv.filter(function(t){return f[0]==="all"||(f[0]==="open"?t.outcome==="open":t.outcome!=="open")}).length;
    fl.appendChild(btn(f[1]+" ("+cnt+")",f[0]===jf?"on":"",function(){jf=f[0];jShown=10;render()}));
  });
  if(!vis.length) ls.appendChild(el("p","hint",trades.length?"No trades here.":"No trades saved yet."));
  var mo=$("more"); mo.textContent="";
  if(vis.length>jShown) mo.appendChild(btn("Show more ("+(vis.length-jShown)+" left)","big",function(){jShown+=10;render()}));
  vis.slice(0,jShown).forEach(function(t){
    var c=el("div","card");
    var h=el("div","ch");
    h.appendChild(el("b","",t.pair+" "+t.side.toUpperCase()));
    h.appendChild(el("span","tag "+t.outcome,LABEL[t.outcome]));
    c.appendChild(h);
    c.appendChild(el("div","hint","Opened: "+tm(oa(t))+" · "+t.strategy));
    if(typeof t.closed==="number") c.appendChild(el("div","hint","Closed: "+tm(t.closed)+" · Lasted "+dur(t.closed-oa(t))));
    c.appendChild(el("div","","Entry "+t.entry+" · SL "+t.sl+" · TP "+t.tp));
    c.appendChild(el("div","","Risk $"+t.risk.toFixed(2)+" · Win $"+t.win.toFixed(2)+" · 1:"+t.rr));
    if(t.outcome!=="open"){var p=plOf(t); c.appendChild(el("div",p>=0?"win":"loss","Result: "+money(p)))}
    if(t.custom) c.appendChild(el("div","hint","Set by you: your own "+t.custom));
    if(t.trend) c.appendChild(el("div","","Trend: "+TREND[t.trend]));
    if(typeof t.lots==="number") c.appendChild(el("div","","Lot size "+t.lots.toFixed(2)+(typeof t.perLot==="number"?" \u00b7 Risk per lot $"+t.perLot.toFixed(2):"")+" \u00b7 Total risk $"+t.risk.toFixed(2)));
    c.appendChild(el("div","","Session: "+sessionOf(oa(t))));
    if(t.reason) c.appendChild(el("div","note","Why I entered: "+t.reason));
    if(t.outcome!=="open"){
      var op=!!coachOpen[t.id];
      c.appendChild(btn(op?"Hide feedback":"Show feedback","ghost small",function(){coachOpen[t.id]=!coachOpen[t.id]; render()}));
    }
    if(t.outcome!=="open" && coachOpen[t.id]){
      var ck=checksFor(t);
      if(ck.length){var cb=el("div","checks"); ck.forEach(function(x){cb.appendChild(el("div",x.ok?"ck ok":"ck bad",(x.ok?"\u2713 ":"\u26a0 ")+x.text))}); c.appendChild(cb)}
      if(coachBusy[t.id]||t.coach){
        c.appendChild(el("div","hint","Coach feedback"));
        var ce=el("div","coach"); ce.id="coach-"+t.id; fillCoach(ce, coachBusy[t.id]||t.coach); c.appendChild(ce);
        if(!coachBusy[t.id]) c.appendChild(btn("Ask coach again","ghost small",function(){delete coachErr[t.id]; getCoach(t,true)}));
        if(!coachBusy[t.id]){
          var sg2=suggestName(t.coach);
          if(sg2 && sg2.toLowerCase()!==t.strategy.toLowerCase()){
            c.appendChild(el("div","hint","Coach suggests renaming this strategy to: "+sg2));
            c.appendChild(btn("Apply to this trade","big",function(){if(!t.strategyWas)t.strategyWas=t.strategy; t.strategy=sg2; persist(); render()}));
            var same=trades.filter(function(x){return x.id!==t.id && x.strategy.toLowerCase()===t.strategy.toLowerCase()}).length;
            if(same>0) c.appendChild(btn("Apply to all "+(same+1)+" trades named "+t.strategy,"ghost small",function(){
              var old=t.strategy.toLowerCase();
              trades.forEach(function(x){if(x.strategy.toLowerCase()===old){if(!x.strategyWas)x.strategyWas=x.strategy; x.strategy=sg2}});
              persist(); render();
            }));
          }
        }
      } else {
        if(coachErr[t.id]) c.appendChild(el("div","hint",coachErr[t.id]));
        c.appendChild(btn("Get feedback","ghost small",function(){delete coachErr[t.id]; getCoach(t,true)}));
      }
    }
    if(t.shots>0){
      var box=el("div","shots"); c.appendChild(box);
      getShots(t.id).then(function(arr){arr.map(normShot).forEach(function(x){var fg=el("figure",""); var im=new Image(); im.src=x.u; im.alt="Screenshot"; fg.onclick=function(){fg.classList.toggle("big3")}; fg.appendChild(im); fg.appendChild(el("figcaption","",KIND[x.k]||"Screenshot")); box.appendChild(fg)})}).catch(function(){});
    }
    if(t.note) c.appendChild(el("div","note",(t.outcome==="out"?"Why I pulled out: ":"Note: ")+t.note));

    if(t.outcome==="open"){
      if(closing && closing.id===t.id){
        c.appendChild(el("div","hint","Closing as: "+LABEL[closing.outcome]));
        var ta=el("textarea"); ta.rows=2;
        ta.placeholder = closing.outcome==="out" ? "Why did you pull out?" : "Any note? (optional)";
        c.appendChild(ta);
        var amt=null;
        if(closing.outcome==="out"){amt=el("input"); amt.setAttribute("inputmode","decimal"); amt.placeholder="Result in $ (minus if loss, example -5)"; amt.style.marginTop="8px"; c.appendChild(amt)}
        var r=el("div","btns");
        r.appendChild(btn("Save","big",function(){
          var v=ta.value.trim();
          if(closing.outcome==="out" && !v){ta.placeholder="Please write why you pulled out.";ta.focus();return}
          if(closing.outcome==="out"){var a=parseFloat(String(amt.value).replace(",",".")); t.pl=isNaN(a)?0:a}
          t.outcome=closing.outcome; t.note=v; t.closed=Date.now(); closing=null; persist(); render(); getCoach(t);
        }));
        r.appendChild(btn("Cancel","ghost",function(){closing=null;render()}));
        c.appendChild(r);
      } else {
        c.appendChild(el("div","hint","How did this trade end?"));
        var row=el("div","btns");
        ["won","lost","out"].forEach(function(o){
          row.appendChild(btn(LABEL[o],"oc "+o,function(){closing={id:t.id,outcome:o};render()}));
        });
        c.appendChild(row);
      }
    }
    c.appendChild(btn(editId===t.id?"Close details":"Edit details","ghost small",function(){editId=(editId===t.id?null:t.id); render()}));
    if(editId===t.id){
      var pn=el("div","edit");
      pn.appendChild(el("div","hint","Market trend"));
      var trS=el("select"); [["","Not sure yet"],["up","Up trend"],["down","Down trend"],["side","Sideways"]].forEach(function(o){var o2=document.createElement("option");o2.value=o[0];o2.textContent=o[1];trS.appendChild(o2)}); trS.value=t.trend||""; pn.appendChild(trS);
      pn.appendChild(el("div","hint","Why did you enter?"));
      var rsT=el("textarea"); rsT.rows=3; rsT.value=t.reason||""; pn.appendChild(rsT);
      pn.appendChild(el("div","hint","Entered how many minutes before you tapped Save? (0 if the same time)"));
      var mnI=el("input"); mnI.setAttribute("inputmode","decimal"); mnI.value=String(Math.round((t.id-oa(t))/60000)); pn.appendChild(mnI);
      pn.appendChild(el("div","hint","Add a screenshot"));
      var flI=el("input"); flI.type="file"; flI.accept="image/*"; flI.multiple=true; pn.appendChild(flI);
      var kdS=el("select"); Object.keys(KIND).forEach(function(k){var o3=document.createElement("option");o3.value=k;o3.textContent=KIND[k];kdS.appendChild(o3)}); kdS.value=(t.outcome==="open")?"entry":"close"; pn.appendChild(kdS);
      var msE=el("div","hint","");
      pn.appendChild(btn("Save details","big",function(){saveDetails(t,trS,rsT,mnI,flI,kdS,msE)}));
      pn.appendChild(msE);
      c.appendChild(pn);
    }
    c.appendChild(btn(delId===t.id?"Tap again to delete":"Delete","ghost small",function(){
      if(delId===t.id){trades=trades.filter(function(x){return x.id!==t.id});delId=null;persist();delShots(t.id)}else{delId=t.id}
      render();
    }));
    ls.appendChild(c);
  });
}

$("saveBtn").onclick=function(){
  var m=$("saveMsg");
  if(!last){m.textContent="Fill in the calculator above first.";return}
  var strat=$("strat").value.trim();
  if(!strat){m.textContent="Type your strategy name first.";return}
  trades.unshift({id:Date.now(),pair:last.pair,side:last.side,entry:last.entry,sl:last.sl,tp:last.tp,pips:last.pips,rr:last.rr,risk:last.risk,win:last.win,lots:last.lots,spread:last.spread,bal:last.bal,perLot:last.perLot,custom:last.custom,strategy:strat,reason:$("why").value.trim(),date:new Date().toLocaleDateString(),outcome:"open",note:"",trend:$("trend").value,shots:0});
  var tr=trades[0], files=Array.prototype.slice.call($("shot").files||[]), kind=$("shotKind").value;
  persist(); $("why").value=""; $("shot").value=""; $("trend").value="";
  m.textContent="Saved. Open the Journal tab to see it."; render();
  if(files.length){
    m.textContent="Saving screenshots...";
    Promise.all(files.map(shrink)).then(function(arr){
      var items=arr.map(function(u){return {u:u,k:kind}}); return putShots(tr.id,items).then(function(){tr.shots=arr.length; persist(); m.textContent="Saved with "+arr.length+" screenshot(s)."; render()});
    }).catch(function(){m.textContent="Trade saved, but the screenshots could not be stored on this browser."});
  }
};

$("bkMake").onclick=function(){
  var ta=$("bkText"), m=$("bkMsg");
  ta.value=JSON.stringify(trades);
  ta.focus(); ta.select();
  try{
    navigator.clipboard.writeText(ta.value).then(
      function(){m.textContent="Copied. Now paste it into a note."},
      function(){m.textContent="Text is selected. Press and hold, then tap Copy."});
  }catch(e){m.textContent="Text is selected. Press and hold, then tap Copy."}
};
$("bkRestore").onclick=function(){
  var m=$("bkMsg"), data;
  try{data=JSON.parse($("bkText").value)}catch(e){m.textContent="That doesn’t look like a backup.";return}
  if(!Array.isArray(data)){m.textContent="That doesn’t look like a backup.";return}
  var have={}, added=0;
  trades.forEach(function(t){have[t.id]=1});
  data.forEach(function(t){
    if(t && t.id && !have[t.id] && typeof t.pair==="string" && typeof t.side==="string" && typeof t.strategy==="string" && typeof t.risk==="number" && typeof t.win==="number" && LABEL[t.outcome]){
      trades.push(t); have[t.id]=1; added++;
    }
  });
  trades.sort(function(a,b){return b.id-a.id});
  persist(); render();
  m.textContent="Restored "+added+" trades.";
};

function saveFile(name,text){
  if(typeof claude!=="undefined" && claude.use){
    return claude.use("downloads").then(function(d){ if(!d) throw {code:"no_downloads"}; return d.save({filename:name,data:text}); });
  }
  var cap=window.Capacitor, P=cap && cap.Plugins;
  if(cap && cap.isNativePlatform && cap.isNativePlatform() && P && P.Filesystem && P.Share){
    /* Inside the Android app: save to a temporary file, then open the share sheet (Drive, WhatsApp, Files...). */
    return P.Filesystem.writeFile({path:name,data:text,directory:"CACHE",encoding:"utf8"}).then(function(r){
      return P.Share.share({title:"Eutrade export",url:r.uri});
    });
  }
  return new Promise(function(res){
    var blob=new Blob([text],{type:"application/json"}), u=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(u)},4000); res();
  });
}
$("exMake").onclick=function(){
  var m=$("exMsg");
  m.textContent="Preparing...";
  Promise.all(trades.map(function(t){
    return (t.shots>0?getShots(t.id):Promise.resolve([])).catch(function(){return []}).then(function(arr){
      var o={}; for(var k in t)o[k]=t[k];
      o.screenshots=arr.map(normShot); o.opened_at=new Date(oa(t)).toISOString(); o.session=sessionOf(oa(t)); o.checks=checksFor(t).map(function(x){return (x.ok?"OK: ":"WARNING: ")+x.text});
      if(typeof t.closed==="number")o.closed_at=new Date(t.closed).toISOString();
      o.result_usd=t.outcome==="open"?null:plOf(t);
      return o;
    });
  })).then(function(all){
    var data=JSON.stringify({app:"Eutrade",exported:new Date().toISOString(),trades:all},null,1);
    return saveFile("eutrade-trades.json",data).then(
      function(){m.textContent="Saved."},
      function(e){m.textContent=(e && e.code==="declined")?"Cancelled.":"Could not save the file."});
  }).catch(function(){m.textContent="Something went wrong."});
};

$("impBtn").onclick=function(){
  var f=($("impFile").files||[])[0], m=$("impMsg");
  if(!f){m.textContent="Choose the export file first.";return}
  var fr=new FileReader();
  fr.onload=function(){
    var data; try{data=JSON.parse(fr.result)}catch(e){m.textContent="That is not an Eutrade export file.";return}
    var list=Array.isArray(data)?data:(data && data.trades);
    if(!Array.isArray(list)){m.textContent="That is not an Eutrade export file.";return}
    var have={}, added=0, jobs=[], drop=["screenshots","opened_at","closed_at","result_usd","session","checks"];
    trades.forEach(function(t){have[t.id]=1});
    list.forEach(function(t){
      if(t && t.id && !have[t.id] && typeof t.pair==="string" && typeof t.side==="string" && typeof t.strategy==="string" && typeof t.risk==="number" && typeof t.win==="number" && LABEL[t.outcome]){
        var shots=Array.isArray(t.screenshots)?t.screenshots.map(normShot).filter(function(x){return x && typeof x.u==="string"}):[];
        var c={}; for(var k in t) if(drop.indexOf(k)<0) c[k]=t[k];
        c.shots=shots.length;
        trades.push(c); have[c.id]=1; added++;
        if(shots.length) jobs.push(putShots(c.id,shots).catch(function(){c.shots=0}));
      }
    });
    Promise.all(jobs).then(function(){
      trades.sort(function(a,b){return b.id-a.id});
      persist(); render();
      m.textContent="Imported "+added+" trades.";
    });
  };
  fr.readAsText(f);
};

/* ---------- Ask the AI and AI settings ---------- */
$("askBtn").onclick=function(){
  var q=$("askQ").value.trim(), out=$("askOut");
  if(!q){out.textContent="Type your question first.";return}
  out.textContent="Thinking...";
  aiCall(null,function(){return guidancePrompt(q)},function(o){out.textContent=plain(o.text)}).then(function(r){
    out.textContent=r.copied?"Prompt copied. Open Claude and paste it.":plain(r.text);
  }).catch(function(e){out.textContent=aiErrText(e)});
};
$("askShortcut").onclick=function(){showTab("backup"); $("askQ").focus()};
function refreshAiState(){
  var m=aiMode();
  $("aiState").textContent = m==="runtime" ? "AI is built in (running inside Claude)." : (m==="api" ? "AI is connected with your API key." : "No API key set. The app will copy prompts so you can paste them into Claude.");
  $("aiSettings").hidden=(m==="runtime");
}
$("keySave").onclick=function(){
  var k=$("apiKey").value.trim(), md=$("apiModel").value.trim();
  try{ if(k)localStorage.setItem(AI_KEY,k); if(md)localStorage.setItem(AI_MODEL,md); }catch(e){}
  $("apiKey").value="";
  $("aiMsg").textContent=k?"Key saved on this phone.":"Model saved.";
  refreshAiState();
};
$("keyDel").onclick=function(){
  try{localStorage.removeItem(AI_KEY)}catch(e){}
  $("aiMsg").textContent="Key removed.";
  refreshAiState();
};
$("apiModel").value=getModel();
refreshAiState();

try{var sb=localStorage.getItem("eutrade_bal"), sr=localStorage.getItem("eutrade_rp"); if(sb)$("bal").value=sb; if(sr)$("rp").value=sr;}catch(e){}
["bal","rp"].forEach(function(i){$(i).addEventListener("input",function(){try{localStorage.setItem("eutrade_"+i,$(i).value)}catch(e){}})});
function showTab(n){
  ["calc","journal","stats","backup"].forEach(function(k){$("t-"+k).hidden=(k!==n)});
  Array.prototype.forEach.call(document.querySelectorAll("#tabs button"),function(b){b.classList.toggle("on",b.getAttribute("data-t")===n)});
  window.scrollTo(0,0);
}
Array.prototype.forEach.call(document.querySelectorAll("#tabs button"),function(b){b.onclick=function(){showTab(b.getAttribute("data-t"))}});

render();
calc();

/* Register the service worker so the app also opens offline. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}

/* Install button: appears when the phone allows installing Eutrade as an app. */
var deferredInstall=null;
window.addEventListener("beforeinstallprompt",function(e){
  e.preventDefault(); deferredInstall=e; $("installBtn").hidden=false;
});
$("installBtn").onclick=function(){
  if(!deferredInstall) return;
  deferredInstall.prompt(); deferredInstall=null; $("installBtn").hidden=true;
};
window.addEventListener("appinstalled",function(){$("installBtn").hidden=true});
