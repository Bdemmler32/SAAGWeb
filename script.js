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

  let events = [];
  let filteredEvents = [];
  let selectedDay = null;
  let days = [];
  let lastUpdated = '';

  // Parse "Day, Month Day" into a Date for sorting
  function parseEventDate(dateStr, year) {
    const [, monthDay] = dateStr.split(', ');
    return new Date(`${monthDay}, ${year}`);
  }

  // Fetch and render
  function fetchScheduleData() {
    // Show loading
    loadingIndicator.style.display = 'block';
    noEventsMessage.style.display = 'none';
    scheduleGrid.style.display = 'none';
    errorMessage.style.display = 'none';

    fetch('schedule-data.json')
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(data => {
        events = data.events;
        filteredEvents = [...events];
        lastUpdated = data.lastUpdated || formatDate(new Date());
        const year = lastUpdated.includes('/') ? parseInt(lastUpdated.split('/')[2]) : new Date().getFullYear();

        // Unique and sorted days
        days = Array.from(new Set(events.map(e => e.Date)));
        days.sort((a, b) => parseEventDate(a, year) - parseEventDate(b, year));

        dateInfo.textContent = `Current as of ${lastUpdated}`;
        loadingIndicator.style.display = 'none';

        // Render vertical list
        scheduleGrid.style.display = 'block';
        createDayButtons();
        renderSchedule();
      })
      .catch(err => {
        console.error(err);
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
      });
  }

  function formatDate(d) {
    const date = new Date(d);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  // Day buttons
  function createDayButtons() {
    dayButtonsContainer.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'day-button active';
    allBtn.textContent = 'All Days';
    allBtn.addEventListener('click', () => setActiveDay(null, allBtn));
    dayButtonsContainer.appendChild(allBtn);

    days.forEach(day => {
      const btn = document.createElement('button');
      btn.className = 'day-button';
      btn.textContent = day.split(',')[0];
      btn.addEventListener('click', () => setActiveDay(day, btn));
      dayButtonsContainer.appendChild(btn);
    });
  }

  function setActiveDay(day, btn) {
    selectedDay = day;
    dayButtonsContainer.querySelectorAll('.day-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  }

  function applyFilters() {
    filteredEvents = selectedDay ? events.filter(e => e.Date === selectedDay) : [...events];
    renderSchedule();
  }

  // Render days stacked vertically
  function renderSchedule() {
    scheduleGrid.innerHTML = '';
    if (filteredEvents.length === 0) {
      noEventsMessage.style.display = 'block';
      return;
    }

    noEventsMessage.style.display = 'none';
    days.forEach(day => {
      const dayEvents = filteredEvents.filter(e => e.Date === day);
      if (dayEvents.length === 0) return;

      // Sort by start time
      dayEvents.sort((a, b) => timeToMinutes(a['Time Start']) - timeToMinutes(b['Time Start']));

      const dayCol = document.createElement('div');
      dayCol.className = 'day-column';

      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = day;
      dayCol.appendChild(header);

      const content = document.createElement('div');
      content.className = 'day-content';
      dayEvents.forEach(ev => content.appendChild(createEventElement(ev)));
      dayCol.appendChild(content);

      scheduleGrid.appendChild(dayCol);
    });
  }

  function createEventElement(ev) {
    const isTicketed = ev['Ticketed Event'] === 'TRUE';
    const item = document.createElement('div');
    item.className = `event ${getTimeCategory(ev['Time Start'])}` + (isTicketed ? ' ticketed' : '');
    item.innerHTML = `
      <div class='event-title'>${ev.Event}</div>
      <div class='event-time'>${ev['Time Start']} - ${ev['Time End']}</div>
    `;
    if (isTicketed) {
      item.innerHTML += `<div class='ticketed-badge'><div class='ticketed-text'>TICKETED</div></div>`;
    }
    item.addEventListener('click', e => { e.stopPropagation(); showTooltip(e, ev); });
    return item;
  }

  function showTooltip(e, ev) {
    const isTicketed = ev['Ticketed Event'] === 'TRUE';
    tooltip.innerHTML = `
      <div class='tooltip-title'>${ev.Event}</div>
      <div class='tooltip-date'>${ev.Date}</div>
      <div class='tooltip-detail'><span class='tooltip-label'>Time:</span> ${ev['Time Start']} - ${ev['Time End']}</div>
      ${isTicketed ? `<div class='tooltip-detail'><span class='tooltip-label'>Ticketed Event</span></div>` : ''}
    `;
    positionTooltip(e.currentTarget);
  }

  function positionTooltip(target) {
    const rect = target.getBoundingClientRect();
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let left = rect.left + (rect.width / 2) - (tw / 2);
    let top = rect.bottom + 8;
    if (left < 8) left = 8;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
    if (top + th > window.innerHeight - 8) top = rect.top - th - 8;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
  }

  // Export each day as its own portrait page
  function exportToPdf() {
    tooltip.style.display = 'none';
    const daysCols = document.querySelectorAll('.day-column');
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    daysCols.forEach(col => {
      const clone = col.cloneNode(true);
      clone.style.width = '816px';
      clone.style.margin = '0 auto 20px';
      clone.style.pageBreakAfter = 'always';
      temp.appendChild(clone);
    });
    document.body.appendChild(temp);
    html2pdf().from(temp).set({
      margin: [10,10,10,10],
      filename: 'schedule-at-a-glance.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { useCORS: true, scale: 1 },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css'] }
    }).save().then(() => document.body.removeChild(temp));
  }

  function getTimeCategory(time) {
    const hour = parseInt(time.split(':')[0], 10);
    const pm = time.includes('PM');
    let h24 = pm && hour !== 12 ? hour + 12 : (hour === 12 && !pm ? 0 : hour);
    if (h24 < 10) return 'morning';
    if (h24 < 13) return 'midday';
    if (h24 < 17) return 'afternoon';
    return 'evening';
  }

  function timeToMinutes(t) {
    const [h, m] = t.split(':');
    const pm = t.includes('PM');
    let h24 = parseInt(h, 10);
    if (pm && h24 !== 12) h24 += 12;
    if (!pm && h24 === 12) h24 = 0;
    return h24 * 60 + parseInt(m, 10);
  }

  // Hide tooltip on outside click or scroll
  document.addEventListener('click', e => { if (!e.target.closest('.event')) tooltip.style.display = 'none'; });
  document.addEventListener('scroll', () => { if (tooltip.style.display === 'block') tooltip.style.display = 'none'; });
});
