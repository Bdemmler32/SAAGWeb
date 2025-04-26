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
    const monthDay = parts[1]; // "November 15"
    return new Date(`${monthDay}, ${year}`);
  }
  
  // Initialize
  fetchScheduleData();
  
  // Set up export button
  exportPdfBtn.addEventListener('click', exportToPdf);
  
  // Close tooltip when clicking elsewhere
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.event')) {
      tooltip.style.display = 'none';
    }
  });
  
  // Make sure tooltip stays in viewport when scrolling
  document.addEventListener('scroll', function() {
    if (tooltip.style.display === 'block') {
      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.bottom > window.innerHeight || 
          tooltipRect.top < 0 || 
          tooltipRect.right > window.innerWidth || 
          tooltipRect.left < 0) {
        tooltip.style.display = 'none';
      }
    }
  });
  
  // Fetch schedule data from JSON file
  function fetchScheduleData() {
    loadingIndicator.style.display = 'block';
    noEventsMessage.style.display = 'none';
    scheduleGrid.style.display = 'none';
    errorMessage.style.display = 'none';
    
    fetch('schedule-data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        events = data.events;
        filteredEvents = [...events];
        lastUpdated = data.lastUpdated || formatDate(new Date());
        
        // Determine year for date parsing
        const year = lastUpdated.includes('/') ? parseInt(lastUpdated.split('/')[2]) : new Date().getFullYear();
        
        // Extract unique days and sort chronologically
        days = [...new Set(events.map(event => event.Date))];
        days.sort((a, b) => parseEventDate(a, year) - parseEventDate(b, year));
        
        // Update date info
        dateInfo.textContent = `Current as of ${lastUpdated}`;
        
        loadingIndicator.style.display = 'none';
        scheduleGrid.style.display = 'grid';
        
        createDayButtons();
        renderSchedule();
      })
      .catch(error => {
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        console.error('Error fetching schedule data:', error);
      });
  }
  
  function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }
  
  function createDayButtons() {
    dayButtonsContainer.innerHTML = '';
    const allDaysBtn = document.createElement('button');
    allDaysBtn.className = 'day-button active';
    allDaysBtn.textContent = 'All Days';
    allDaysBtn.addEventListener('click', function() {
      setActiveDay(null, this);
    });
    dayButtonsContainer.appendChild(allDaysBtn);
    
    days.forEach(day => {
      const btn = document.createElement('button');
      btn.className = 'day-button';
      btn.textContent = day.split(',')[0];
      btn.addEventListener('click', function() {
        setActiveDay(day, this);
      });
      dayButtonsContainer.appendChild(btn);
    });
  }
  
  function setActiveDay(day, button) {
    selectedDay = day;
    const buttons = dayButtonsContainer.querySelectorAll('.day-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    applyFilters();
  }
  
  function applyFilters() {
    let filtered = [...events];
    if (selectedDay) {
      filtered = filtered.filter(event => event.Date === selectedDay);
    }
    filteredEvents = filtered;
    renderSchedule();
  }
  
  function renderSchedule() {
    scheduleGrid.innerHTML = '';
    if (filteredEvents.length === 0) {
      noEventsMessage.style.display = 'block';
      return;
    } else {
      noEventsMessage.style.display = 'none';
    }
    
    const eventsByDay = {};
    days.forEach(day => {
      eventsByDay[day] = filteredEvents.filter(event => event.Date === day);
      // sort each day's events by start time
      eventsByDay[day].sort((a, b) => timeToMinutes(a['Time Start']) - timeToMinutes(b['Time Start']));
    });
    
    days.forEach(day => {
      const dayEvents = eventsByDay[day];
      if (dayEvents.length === 0) return;
      const column = document.createElement('div');
      column.className = 'day-column';
      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = day;
      column.appendChild(header);
      const content = document.createElement('div');
      content.className = 'day-content';
      dayEvents.forEach(event => {
        content.appendChild(createEventElement(event));
      });
      column.appendChild(content);
      scheduleGrid.appendChild(column);
    });
  }
  
  function createEventElement(event) {
    const timeCategory = getTimeCategory(event['Time Start']);
    const isTicketed = event['Ticketed Event'] === 'TRUE';
    const element = document.createElement('div');
    element.className = `event ${timeCategory}` + (isTicketed ? ' ticketed' : '');
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = event.Event;
    const time = document.createElement('div');
    time.className = 'event-time';
    time.textContent = `${event['Time Start']} - ${event['Time End']}`;
    element.appendChild(title);
    element.appendChild(time);
    if (isTicketed) {
      const badge = document.createElement('div');
      badge.className = 'ticketed-badge';
      const badgeText = document.createElement('div');
      badgeText.className = 'ticketed-text';
      badgeText.textContent = 'TICKETED';
      badge.appendChild(badgeText);
      element.appendChild(badge);
    }
    element.addEventListener('click', e => {
      e.stopPropagation();
      showEventTooltip(e, event);
    });
    return element;
  }
  
  function showEventTooltip(e, event) {
    const isTicketed = event['Ticketed Event'] === 'TRUE';
    let tooltipContent = `
      <div class='tooltip-title'>${event.Event}</div>
      <div class='tooltip-date'>${event.Date}</div>
      <div class='tooltip-detail'><span class='tooltip-label'>Time:</span> ${event['Time Start']} - ${event['Time End']}</div>
    `;
    if (isTicketed) {
      tooltipContent += `<div class='tooltip-detail'><span class='tooltip-label'>Ticketed Event</span></div>`;
    }
    tooltip.innerHTML = tooltipContent;
    const rect = e.currentTarget.getBoundingClientRect();
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    tooltip.style.visibility = '';
    let left = rect.right + 10, top = rect.top;
    if (left + tw > window.innerWidth - 10) {
      left = rect.left - tw - 10;
      if (left < 10) {
        left = Math.max(10, rect.left + rect.width/2 - tw/2);
        top = rect.top > window.innerHeight/2 ? rect.top - th - 10 : rect.bottom + 10;
      }
    }
    if (top < 10) top = 10;
    if (top + th > window.innerHeight - 10) top = window.innerHeight - th - 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
  }
  
  function exportToPdf() {
    tooltip.style.display = 'none';
    html2pdf().from(document.getElementById('schedule-container')).set({
      margin: 10,
      filename: 'schedule-at-a-glance.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).save();
  }
  
  function getTimeCategory(timeStart) {
    const hour = parseInt(timeStart.split(':')[0]);
    const isPM = timeStart.includes('PM');
    const hour24 = isPM && hour !== 12 ? hour + 12 : (hour === 12 && !timeStart.includes('PM') ? 0 : hour);
    if (hour24 < 10) return 'morning';
    if (hour24 < 13) return 'midday';
    if (hour24 < 17) return 'afternoon';
    return 'evening';
  }
  
  function timeToMinutes(timeStr) {
    const [h, mPart] = timeStr.split(':');
    const minutes = parseInt(mPart);
    const isPM = timeStr.includes('PM');
    let hour24 = parseInt(h);
    if (isPM && hour24 !== 12) hour24 += 12;
    if (!isPM && hour24 === 12) hour24 = 0;
    return hour24 * 60 + minutes;
  }
});
