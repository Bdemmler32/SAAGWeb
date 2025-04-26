document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const dayButtonsContainer = document.getElementById('dayButtons');
  const scheduleGrid = document.getElementById('scheduleGrid');
  const noEventsMessage = document.getElementById('noEvents');
  const tooltip = document.getElementById('tooltip');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const dateInfo = document.getElementById('date-info');
  const loadingIndicator = document.getElementById('loading');
  const errorMessage = document.getElementById('errorMessage');
  
  // State variables
  let events = [];
  let filteredEvents = [];
  let selectedDay = null;
  let days = [];
  let lastUpdated = '';
  
  // Helper: parse event date string into a Date object
  function parseEventDate(dateStr, year) {
    // dateStr like "Saturday, November 15"
    const parts = dateStr.split(', ');
    const monthDay = parts[1];
    return new Date(`${monthDay}, ${year}`);
  }
  
  // Initialize
  fetchScheduleData();
  
  // Set up export button
  exportPdfBtn.addEventListener('click', exportToPdf);
  
  // Close tooltip when clicking elsewhere
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.event')) tooltip.style.display = 'none';
  });
  
  // Hide tooltip if it goes off viewport on scroll
  document.addEventListener('scroll', function() {
    if (tooltip.style.display === 'block') {
      const r = tooltip.getBoundingClientRect();
      if (r.bottom > window.innerHeight || r.top < 0 || r.right > window.innerWidth || r.left < 0) {
        tooltip.style.display = 'none';
      }
    }
  });
  
  // Fetch schedule data
  function fetchScheduleData() {
    loadingIndicator.style.display = 'block';
    noEventsMessage.style.display = 'none';
    scheduleGrid.style.display = 'none';
    errorMessage.style.display = 'none';
    
    fetch('schedule-data.json')
      .then(r => { if (!r.ok) throw new Error('Network response was not ok'); return r.json(); })
      .then(data => {
        events = data.events;
        filteredEvents = [...events];
        lastUpdated = data.lastUpdated || formatDate(new Date());
        const year = lastUpdated.includes('/') ? parseInt(lastUpdated.split('/')[2]) : new Date().getFullYear();
        days = [...new Set(events.map(ev => ev.Date))];
        days.sort((a,b) => parseEventDate(a, year) - parseEventDate(b, year));
        dateInfo.textContent = `Current as of ${lastUpdated}`;
        loadingIndicator.style.display = 'none';
        scheduleGrid.style.display = 'grid';
        createDayButtons(); renderSchedule();
      })
      .catch(err => {
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        console.error('Error fetching schedule data:', err);
      });
  }
  
  function formatDate(date) {
    const d = new Date(date);
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;
  }
  
  function createDayButtons() {
    dayButtonsContainer.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'day-button active'; allBtn.textContent = 'All Days';
    allBtn.addEventListener('click', () => setActiveDay(null, allBtn));
    dayButtonsContainer.appendChild(allBtn);
    days.forEach(day => {
      const btn = document.createElement('button');
      btn.className = 'day-button'; btn.textContent = day.split(',')[0];
      btn.addEventListener('click', () => setActiveDay(day, btn));
      dayButtonsContainer.appendChild(btn);
    });
  }
  
  function setActiveDay(day, btn) {
    selectedDay = day;
    dayButtonsContainer.querySelectorAll('.day-button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); applyFilters();
  }
  
  function applyFilters() {
    filteredEvents = selectedDay ? events.filter(ev => ev.Date === selectedDay) : [...events];
    renderSchedule();
  }
  
  function renderSchedule() {
    scheduleGrid.innerHTML = '';
    if (!filteredEvents.length) { noEventsMessage.style.display = 'block'; return; }
    noEventsMessage.style.display = 'none';
    const byDay = {};
    days.forEach(day => {
      const list = filteredEvents.filter(ev=>ev.Date===day);
      list.sort((a,b)=>timeToMinutes(a['Time Start'])-timeToMinutes(b['Time Start']));
      if (list.length) byDay[day]=list;
    });
    Object.keys(byDay).forEach(day=>{
      const col=document.createElement('div'); col.className='day-column';
      const hdr=document.createElement('div'); hdr.className='day-header'; hdr.textContent=day;
      const cont=document.createElement('div'); cont.className='day-content';
      byDay[day].forEach(ev=>cont.appendChild(createEventElement(ev)));
      col.append(hdr,cont); scheduleGrid.appendChild(col);
    });
  }
  
  function createEventElement(event) {
    const isTicketed=event['Ticketed Event']==='TRUE';
    const el=document.createElement('div');
    el.className=`event ${getTimeCategory(event['Time Start'])}`+(isTicketed?' ticketed':'');
    el.innerHTML=`<div class='event-title'>${event.Event}</div>
                  <div class='event-time'>${event['Time Start']} - ${event['Time End']}</div>`;
    if(isTicketed) el.innerHTML+=`<div class='ticketed-badge'><div class='ticketed-text'>TICKETED</div></div>`;
    el.addEventListener('click',e=>{e.stopPropagation(); showEventTooltip(e,event);});
    return el;
  }
  
  function showEventTooltip(e,event){
    const isTicketed=event['Ticketed Event']==='TRUE';
    tooltip.innerHTML=`<div class='tooltip-title'>${event.Event}</div>
                       <div class='tooltip-date'>${event.Date}</div>
                       <div class='tooltip-detail'><span class='tooltip-label'>Time:</span> ${event['Time Start']} - ${event['Time End']}</div>`+
                     (isTicketed?`<div class='tooltip-detail'><span class='tooltip-label'>Ticketed Event</span></div>`:'');
    const r=e.currentTarget.getBoundingClientRect(); tooltip.style.display='block'; tooltip.style.visibility='hidden';
    const tw=tooltip.offsetWidth, th=tooltip.offsetHeight; tooltip.style.visibility='';
    let left=r.right+10, top=r.top;
    if(left+tw>window.innerWidth-10){left=r.left-tw-10; if(left<10){left=Math.max(10,r.left+r.width/2-tw/2); top=r.top>window.innerHeight/2?r.top-th-10:r.bottom+10;}};
    if(top<10) top=10; if(top+th>window.innerHeight-10) top=window.innerHeight-th-10;
    tooltip.style.left=`${left}px`; tooltip.style.top=`${top}px`;
  }
  
  // Export to single landscape letter page with auto-scaling
  function exportToPdf() {
    tooltip.style.display = 'none';
    const container = document.getElementById('schedule-container');
    // Calculate page px dimensions for Letter landscape
    const mmToPx = mm => mm * (96/25.4);
    const pageW = mmToPx(279.4), pageH = mmToPx(215.9);
    // Determine scale to fit
    const scale = Math.min(pageW/container.scrollWidth, pageH/container.scrollHeight);
    // Clone and scale
    const clone = container.cloneNode(true);
    clone.style.transform = `scale(${scale})`;
    clone.style.transformOrigin = 'top left';
    clone.style.width = `${container.scrollWidth}px`;
    clone.style.height = `${container.scrollHeight}px`;
    clone.style.background = '#fff';
    clone.style.position = 'absolute'; clone.style.left = '-9999px';
    document.body.appendChild(clone);

    html2pdf().from(clone).set({
      margin: 0,
      filename: 'schedule-at-a-glance.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { useCORS: true, scale: 1 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'landscape' }
    }).save().then(() => {
      document.body.removeChild(clone);
    });
  }
  
  function getTimeCategory(time) {
    const h=parseInt(time.split(':')[0]); const pm=time.includes('PM');
    let hh=pm&&h!==12?h+12:(h===12&&!pm?0:h);
    return hh<10?'morning':hh<13?'midday':hh<17?'afternoon':'evening';
  }
  
  function timeToMinutes(t) {
    const [h,m]=t.split(':'); const mins=parseInt(m); const pm=t.includes('PM');
    let hh=parseInt(h); if(pm&&hh!==12) hh+=12; if(!pm&&hh===12) hh=0;
    return hh*60+mins;
  }
});
