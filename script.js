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
      
      // Check if tooltip is now outside viewport due to scrolling
      if (tooltipRect.bottom > window.innerHeight || 
          tooltipRect.top < 0 || 
          tooltipRect.right > window.innerWidth || 
          tooltipRect.left < 0) {
        // Hide tooltip if it's now outside viewport
        tooltip.style.display = 'none';
      }
    }
  });
  
  // Fetch schedule data from JSON file
  function fetchScheduleData() {
    // Show loading indicator
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
        // Process data
        events = data.events;
        filteredEvents = [...events];
        lastUpdated = data.lastUpdated || formatDate(new Date());
        
        // Extract unique days from events
        days = [...new Set(events.map(event => event.Date))].sort();
        
        // Update date info
        dateInfo.textContent = `Current as of ${lastUpdated}`;
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        scheduleGrid.style.display = 'grid';
        
        // Initialize UI
        createDayButtons();
        renderSchedule();
      })
      .catch(error => {
        // Show error message
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        console.error('Error fetching schedule data:', error);
      });
  }
  
  // Format date as MM/DD/YYYY
  function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }
  
  // Create day filter buttons
  function createDayButtons() {
    // Clear container
    dayButtonsContainer.innerHTML = '';
    
    // All days button
    const allDaysBtn = document.createElement('button');
    allDaysBtn.className = 'day-button active';
    allDaysBtn.textContent = 'All Days';
    allDaysBtn.addEventListener('click', function() {
      setActiveDay(null, this);
    });
    dayButtonsContainer.appendChild(allDaysBtn);
    
    // Day-specific buttons
    days.forEach(day => {
      const btn = document.createElement('button');
      btn.className = 'day-button';
      btn.textContent = day.split(',')[0]; // Just the day name
      btn.addEventListener('click', function() {
        setActiveDay(day, this);
      });
      dayButtonsContainer.appendChild(btn);
    });
  }
  
  // Set active day
  function setActiveDay(day, button) {
    selectedDay = day;
    
    // Update button styles
    const buttons = dayButtonsContainer.querySelectorAll('.day-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    applyFilters();
  }
  
  // Apply filters and update display
  function applyFilters() {
    let filtered = [...events];
    
    if (selectedDay) {
      filtered = filtered.filter(event => event.Date === selectedDay);
    }
    
    filteredEvents = filtered;
    renderSchedule();
  }
  
  // Render the schedule grid
  function renderSchedule() {
    scheduleGrid.innerHTML = '';
    
    if (filteredEvents.length === 0) {
      noEventsMessage.style.display = 'block';
      return;
    } else {
      noEventsMessage.style.display = 'none';
    }
    
    // Group events by day
    const eventsByDay = {};
    days.forEach(day => {
      eventsByDay[day] = filteredEvents.filter(event => event.Date === day);
    });
    
    // Create columns for days with events
    days.forEach(day => {
      const dayEvents = eventsByDay[day];
      
      if (dayEvents.length === 0) return;
      
      // Create column element
      const column = document.createElement('div');
      column.className = 'day-column';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = day;
      column.appendChild(header);
      
      // Create content container
      const content = document.createElement('div');
      content.className = 'day-content';
      
      // Sort events by time
      dayEvents.sort((a, b) => {
        return timeToMinutes(a["Time Start"]) - timeToMinutes(b["Time Start"]);
      });
      
      // Add events
      dayEvents.forEach(event => {
        const eventEl = createEventElement(event);
        content.appendChild(eventEl);
      });
      
      column.appendChild(content);
      scheduleGrid.appendChild(column);
    });
  }
  
  // Create an event element
  function createEventElement(event) {
    const timeCategory = getTimeCategory(event["Time Start"]);
    const isTicketed = event["Ticketed Event"] === "TRUE";
    
    const element = document.createElement('div');
    element.className = `event ${timeCategory}`;
    if (isTicketed) {
      element.classList.add('ticketed');
    }
    
    // Event title
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = event.Event;
    
    // Time display
    const time = document.createElement('div');
    time.className = 'event-time';
    time.textContent = `${event["Time Start"]} - ${event["Time End"]}`;
    
    element.appendChild(title);
    element.appendChild(time);
    
    // Add ticketed badge if needed
    if (isTicketed) {
      const badge = document.createElement('div');
      badge.className = 'ticketed-badge';
      
      const badgeText = document.createElement('div');
      badgeText.className = 'ticketed-text';
      badgeText.textContent = 'TICKETED';
      
      badge.appendChild(badgeText);
      element.appendChild(badge);
    }
    
    // Add mouse events for tooltip
    element.addEventListener('mouseenter', function(e) {
      showEventTooltip(e, event);
    });
    
    element.addEventListener('mouseleave', function() {
      // We'll handle hiding with document click instead
    });
    
    element.addEventListener('click', function(e) {
      e.stopPropagation();
      showEventTooltip(e, event);
    });
    
    return element;
  }
  
  // Show tooltip for an event
  function showEventTooltip(e, event) {
    const isTicketed = event["Ticketed Event"] === "TRUE";
    
    // Set tooltip content
    let tooltipContent = `
      <div class="tooltip-title">${event.Event}</div>
      <div class="tooltip-date">${event.Date}</div>
      <div class="tooltip-detail">
        <span class="tooltip-label">Time:</span> 
        ${event["Time Start"]} - ${event["Time End"]}
      </div>
    `;
    
    // Only include ticketed info if it's a ticketed event
    if (isTicketed) {
      tooltipContent += `
        <div class="tooltip-detail">
          <span class="tooltip-label">Ticketed Event</span>
        </div>
      `;
    }
    
    tooltip.innerHTML = tooltipContent;
    
    // Calculate position to ensure tooltip is fully visible
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Make tooltip visible but hidden for measuring
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    tooltip.style.visibility = '';
    
    // Initial position (try to position to the right first)
    let left = rect.right + 10;
    let top = rect.top;
    
    // Check right edge
    if (left + tooltipWidth > viewportWidth - 10) {
      // Try left side instead
      left = rect.left - tooltipWidth - 10;
      
      // If still doesn't fit, center horizontally
      if (left < 10) {
        left = Math.max(10, Math.min(viewportWidth - tooltipWidth - 10, 
                                     rect.left + (rect.width / 2) - (tooltipWidth / 2)));
        
        // Position above or below based on available space
        if (rect.top > viewportHeight / 2) {
          // More space above, position above the element
          top = rect.top - tooltipHeight - 10;
        } else {
          // More space below, position below the element
          top = rect.bottom + 10;
        }
      }
    }
    
    // Check top edge
    if (top < 10) {
      top = 10;
    }
    
    // Check bottom edge
    if (top + tooltipHeight > viewportHeight - 10) {
      top = viewportHeight - tooltipHeight - 10;
    }
    
    // Apply final position
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
  }
  
  // Export schedule to PDF
  function exportToPdf() {
    // Hide tooltip during export
    tooltip.style.display = 'none';
    
    // Create a temporary container for PDF export that excludes filters
    const tempContainer = document.createElement('div');
    tempContainer.className = 'container';
    
    // Clone header
    const headerClone = document.querySelector('.header').cloneNode(true);
    // Remove the export button from the clone
    const exportBtnClone = headerClone.querySelector('.export-btn');
    if (exportBtnClone) {
      headerClone.removeChild(exportBtnClone);
    }
    tempContainer.appendChild(headerClone);
    
    // Clone legend only (not filters)
    const legendClone = document.querySelector('.legend').cloneNode(true);
    const legendContainer = document.createElement('div');
    legendContainer.className = 'filters-container';
    legendContainer.style.textAlign = 'center';
    legendContainer.appendChild(legendClone);
    tempContainer.appendChild(legendContainer);
    
    // Clone schedule grid
    const scheduleGridClone = document.getElementById('scheduleGrid').cloneNode(true);
    tempContainer.appendChild(scheduleGridClone);
    
    // Clone no events message if visible
    if (noEventsMessage.style.display !== 'none') {
      const noEventsClone = noEventsMessage.cloneNode(true);
      tempContainer.appendChild(noEventsClone);
    }
    
    // Add temporary container to document (invisible)
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);
    
    // Define options for html2pdf
    const options = {
      margin: 10,
      filename: 'schedule-at-a-glance.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    // Generate PDF
    html2pdf().from(tempContainer).set(options).save().then(() => {
      // Clean up - remove temporary container after PDF is generated
      document.body.removeChild(tempContainer);
    });
  }
  
  // Get time category based on hour
  function getTimeCategory(timeStart) {
    const hour = parseInt(timeStart.split(':')[0]);
    const isPM = timeStart.includes('PM');
    
    const hour24 = isPM && hour !== 12 ? hour + 12 : hour;
    
    if (hour24 < 10) return 'morning';
    if (hour24 < 13) return 'midday';
    if (hour24 < 17) return 'afternoon';
    return 'evening';
  }
  
  // Convert time to minutes for sorting
  function timeToMinutes(timeStr) {
    const hour = parseInt(timeStr.split(':')[0]);
    const minutePart = timeStr.split(':')[1];
    const minutes = parseInt(minutePart);
    const isPM = timeStr.includes('PM');
    
    let hour24 = hour;
    if (isPM && hour !== 12) hour24 = hour + 12;
    if (!isPM && hour === 12) hour24 = 0;
    
    return hour24 * 60 + minutes;
  }
});