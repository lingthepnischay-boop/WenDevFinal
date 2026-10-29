(function(){
  var KEY="cal-items-v1", items={}, view=new Date(), sel=null, lastTap={k:null,t:0};
  var MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var $=function(id){return document.getElementById(id)};

  // Load saved items
  try{var raw=localStorage.getItem(KEY);if(raw)items=JSON.parse(raw)||{}}catch(e){items={}}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(items))}catch(e){}}
  function pad(n){return n<10?"0"+n:""+n}
  function key(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
  function fromKey(k){var p=k.split("-");return new Date(+p[0],+p[1]-1,+p[2])}
  function esc(s){return s.replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function sorted(k){return (items[k]||[]).slice().sort(function(a,b){return (a.time||"99").localeCompare(b.time||"99")})}

  $("dow").innerHTML=DAYS.map(function(d){return "<div>"+d+"</div>"}).join("");
  sel=key(new Date());

  // Draw the month grid
  function render(){
    var y=view.getFullYear(),m=view.getMonth();
    $("title").textContent=MONTHS[m]+" "+y;
    var first=new Date(y,m,1).getDay(), start=new Date(y,m,1-first), tk=key(new Date()), html="";
    for(var i=0;i<42;i++){
      var d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i), k=key(d), list=items[k]||[];
      var hasE=list.some(function(x){return x.type==="e"}), hasR=list.some(function(x){return x.type==="r"});
      var cls="day"+(d.getMonth()!==m?" out":"")+(list.length?" has":"")+(k===tk?" today":"")+(k===sel?" sel":"");
      var label=d.toDateString()+(list.length?", "+list.length+" item"+(list.length>1?"s":""):", no items");
      html+='<button class="'+cls+'" data-k="'+k+'" aria-label="'+label+'">'+d.getDate()+
        (list.length>1?'<span class="count">'+list.length+'</span>':'')+
        (list.length?'<span class="dots">'+(hasE?'<i class="dot e"></i>':'')+(hasR?'<i class="dot r"></i>':'')+'</span>':'')+'</button>';
    }
    $("grid").innerHTML=html;
    renderPanel();
  }

  // Show the selected day's events/reminders
  function renderPanel(){
    var d=fromKey(sel), list=sorted(sel);
    var h='<h3>'+DAYS[d.getDay()]+', '+MONTHS[d.getMonth()]+' '+d.getDate()+'</h3>';
    h+='<div class="sub">'+(list.length?list.length+' item'+(list.length>1?'s':''):'Nothing scheduled')+'</div>';
    if(list.length){
      h+='<ul class="list">'+list.map(function(x){
        return '<li class="item '+x.type+'"><span class="t">'+(x.time||"All day")+'</span><span class="n">'+esc(x.title)+
          '<div class="k">'+(x.type==="e"?"Event":"Reminder")+'</div></span><button class="x" data-del="'+x.id+'" aria-label="Delete '+esc(x.title)+'">×</button></li>';
      }).join("")+'</ul>';
    } else h+='<div class="empty">No events or reminders on this day.</div>';
    h+='<button class="btn primary" id="add">Add event or reminder</button>';
    $("panel").innerHTML=h;
  }

  // Single click selects; second click on the same day within 350ms = double-click (also works on touch)
  $("grid").addEventListener("click",function(e){
    var b=e.target.closest(".day");if(!b)return;
    var k=b.getAttribute("data-k"), now=Date.now();
    if(lastTap.k===k&&now-lastTap.t<350){lastTap={k:null,t:0};sel=k;syncMonth(k);openModal(k);return}
    lastTap={k:k,t:now};sel=k;syncMonth(k);
  });
  function syncMonth(k){
    var d=fromKey(k);
    if(d.getMonth()!==view.getMonth()||d.getFullYear()!==view.getFullYear())view=new Date(d.getFullYear(),d.getMonth(),1);
    render();
  }

  // Add button and delete buttons in the side panel
  $("panel").addEventListener("click",function(e){
    if(e.target.id==="add")openModal(sel);
    var del=e.target.getAttribute&&e.target.getAttribute("data-del");
    if(del){
      items[sel]=(items[sel]||[]).filter(function(x){return x.id!==del});
      if(!items[sel].length)delete items[sel];
      persist();render();
    }
  });

  // Month navigation
  $("prev").onclick=function(){view=new Date(view.getFullYear(),view.getMonth()-1,1);render()};
  $("next").onclick=function(){view=new Date(view.getFullYear(),view.getMonth()+1,1);render()};
  $("today").onclick=function(){view=new Date();sel=key(view);render()};

  // Add form
  function openModal(k){
    $("f-title").value="";$("f-date").value=k;$("f-time").value="";$("f-type").value="e";
    $("modal").classList.add("open");setTimeout(function(){$("f-title").focus()},0);
  }
  function closeModal(){$("modal").classList.remove("open")}
  $("cancel").onclick=closeModal;
  $("modal").addEventListener("click",function(e){if(e.target.id==="modal")closeModal()});
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape")closeModal();
    if(e.key==="Enter"&&$("modal").classList.contains("open")&&e.target.tagName==="INPUT")$("save").click();
  });
  $("save").onclick=function(){
    var t=$("f-title").value.trim(), k=$("f-date").value;
    if(!t){$("f-title").focus();return}
    if(!k)k=sel;
    (items[k]=items[k]||[]).push({
      id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),
      title:t,time:$("f-time").value,type:$("f-type").value
    });
    persist();closeModal();sel=k;syncMonth(k);
  };

  // Digital clock + reminder alerts
  var fired={};
  function tick(){
    var n=new Date();
    $("time").innerHTML=pad(n.getHours())+'<span class="colon">:</span>'+pad(n.getMinutes())+'<span class="sec">'+pad(n.getSeconds())+'</span>';
    $("cdate").textContent=DAYS[n.getDay()]+", "+MONTHS[n.getMonth()]+" "+n.getDate()+", "+n.getFullYear();
    var k=key(n), hm=pad(n.getHours())+":"+pad(n.getMinutes());
    (items[k]||[]).forEach(function(x){
      if(x.type==="r"&&x.time===hm&&!fired[x.id+k+hm]){fired[x.id+k+hm]=1;toast("Reminder: "+x.title)}
    });
    if(k!==tick.last){tick.last=k;render()}   // refresh "today" highlight at midnight
  }
  function toast(msg){
    var t=$("toast");t.textContent=msg;t.classList.add("show");
    setTimeout(function(){t.classList.remove("show")},6000);
  }

  render();tick();setInterval(tick,1000);
})();