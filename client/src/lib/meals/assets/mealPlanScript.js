
  function setOpen(el, open){ el.classList.toggle('open', open); var head=el.querySelector('[role="button"]'); if(head) head.setAttribute('aria-expanded', open); }
  function stickyOffset(){ var h=document.querySelector('.header'); var n=document.querySelector('.section-nav'); return (h?h.offsetHeight:0)+(n?n.offsetHeight:0)+12; }
  function scrollToEl(el){ var y=el.getBoundingClientRect().top + window.pageYOffset - stickyOffset(); window.scrollTo({top:y, behavior:'smooth'}); }
  function toggleRecipe(id){ var el=document.getElementById(id); if(el) setOpen(el, !el.classList.contains('open')); }
  function openRecipe(id){ var el=document.getElementById(id); if(!el) return; setOpen(el, true); requestAnimationFrame(function(){ scrollToEl(el); }); }

  /* Persistence (Links /state endpoint). No-op when there is no /f/:uuid in
     the path (local preview, pre-upload) — preserves current behaviour. */
  var STATE_BASE = 'https://yourblckbx.com/f/';
  function getDocUuid(){
    var m = window.location.pathname.match(/^\/f\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i);
    return m ? m[1] : null;
  }

  var persistTimer = null;
  var hydrating = false;
  function persistShop(){
    if (hydrating) return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(doPersistShop, 800);
  }
  function doPersistShop(){
    var uuid = getDocUuid();
    if (!uuid) return; // local/preview — no-op, matches current behaviour exactly
    var payload = { state: { shop: shop, checked: Array.from(checkedSet) } };
    var body = JSON.stringify(payload);
    function attempt(){
      return fetch(STATE_BASE + uuid + '/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: body
      });
    }
    attempt().catch(function(){
      setTimeout(function(){ attempt().catch(function(){ console.warn('[blckbx] shop state: save failed'); }); }, 3000);
    });
  }

  function hydrateShop(){
    var uuid = getDocUuid();
    if (!uuid) { renderShop(); return; } // preview/local: render empty as today
    hydrating = true;
    fetch(STATE_BASE + uuid + '/state', { credentials: 'omit' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        var s = data && data.state;
        if (s && Array.isArray(s.shop)) {
          shop = s.shop.filter(function(x){ return typeof x === 'string'; });
        }
        if (s && Array.isArray(s.checked)) {
          checkedSet = new Set(s.checked.filter(function(x){ return typeof x === 'string'; }));
        }
      })
      .catch(function(){ /* fail soft — keep defaults */ })
      .finally(function(){ renderShop(); hydrating = false; });
  }

  /* Dynamic shopping list (in-memory for the session). data-shop = the realistic,
     purchasable item; SHOP_QTY = how much to buy for the whole week.
     Fill ONE entry per unique data-shop value, e.g.
       "Garlic": "2 bulbs", "Green beans": "200g", "Eggs": "1 box"
     Aggregate across every recipe that uses the item. */
  var SHOP_QTY = { /* "Item name": "buy qty for the week" */ };
  var shop = []; var checkedSet = new Set();
  function inShop(name){ return shop.indexOf(name) > -1; }
  function addShop(btn){ var li=btn.closest('li'); var name=li.getAttribute('data-shop'); if(!name) return; var i=shop.indexOf(name); if(i>-1){ shop.splice(i,1); } else { shop.push(name); } renderShop(); }
  function removeShop(name){ checkedSet.delete(name); var i=shop.indexOf(name); if(i>-1){ shop.splice(i,1); renderShop(); } }
  function clearShop(){ shop=[]; checkedSet.clear(); renderShop(); }
  function renderShop(){
    document.querySelectorAll('.ingredients li[data-shop]').forEach(function(li){ li.classList.toggle('added', inShop(li.getAttribute('data-shop'))); });
    var ul=document.getElementById('shop-list'); ul.innerHTML='';
    shop.forEach(function(name){
      var li=document.createElement('li'); li.className='shop-item';
      var label=document.createElement('label');
      var cb=document.createElement('input'); cb.type='checkbox';
      cb.checked = checkedSet.has(name);
      cb.addEventListener('change', function(){
        if (cb.checked) { checkedSet.add(name); } else { checkedSet.delete(name); }
        persistShop();
      });
      var span=document.createElement('span'); span.textContent=name;
      var q=SHOP_QTY[name]; if(q){ var qs=document.createElement('span'); qs.className='shop-qty'; qs.textContent=' \u00b7 '+q; span.appendChild(qs); }
      label.appendChild(cb); label.appendChild(span);
      var rm=document.createElement('button'); rm.type='button'; rm.className='shop-remove'; rm.setAttribute('aria-label','Remove '+name); rm.textContent='\u00d7';
      rm.addEventListener('click', function(){ removeShop(name); });
      li.appendChild(label); li.appendChild(rm); ul.appendChild(li);
    });
    document.getElementById('shop-empty').hidden = shop.length > 0;
    document.getElementById('shop-clear').hidden = shop.length === 0;
    var c=document.getElementById('shop-count'); if(c) c.textContent = shop.length ? ('\u00b7 '+shop.length+(shop.length===1?' item':' items')) : '';
    persistShop();
  }

  document.querySelectorAll('.nav-link[href^="#"]').forEach(function(a){ a.addEventListener('click', function(e){ var el=document.querySelector(a.getAttribute('href')); if(!el) return; e.preventDefault(); scrollToEl(el); }); });
  document.addEventListener('keydown', function(e){ if((e.key==='Enter'||e.key===' ') && e.target.getAttribute('role')==='button'){ e.preventDefault(); e.target.click(); } });
  window.addEventListener('DOMContentLoaded', function(){
    hydrateShop();
    if(location.hash){ var el=document.querySelector(location.hash); if(el && el.classList.contains('recipe')){ setOpen(el, true); requestAnimationFrame(function(){ scrollToEl(el); }); } }
  });
