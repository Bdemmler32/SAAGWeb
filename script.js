document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const dayButtonsContainer = document.getElementById('dayButtons');
  const scheduleGrid = document.getElementById('scheduleGrid');
  const noEventsMessage = document.getElementById('noEvents');
  const tooltip = document.getElementById('tooltip');
  const dateInfo = document.getElementById('date-info');
  const loadingIndicator = document.getElementById('loading');
  const errorMessage = document.getElementById('errorMessage');
  
  // State variables
  let events = [];
  let filteredEvents = [];
  let selectedDay = null;
  let lastUpdated = '';
  
  // Initialize
  fetchScheduleData();
  
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
        
        // Sort events chronologically by date and time
        events.sort((a, b) => {
          const dateA = new Date(a.Date.split(',')[1] + ',' + a.Date.split(',')[0]);
          const dateB = new Date(b.Date.split(',')[1] + ',' + b.Date.split(',')[0]);
          
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
          }
          
          // If same date, sort by time
          return timeToMinutes(a["Time Start"]) - timeToMinutes(b["Time Start"]);
        });
        
        filteredEvents = [...events];
        lastUpdated = data.lastUpdated || formatDate(new Date());
        
        // Update date info
        dateInfo.textContent = `Current as of ${lastUpdated}`;
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        scheduleGrid.style.display = 'flex';
        
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
    
    // Get all unique days from the events
    const uniqueDays = [...new Set(events.map(event => event.Date))];
    
    // Sort uniqueDays chronologically
    uniqueDays.sort((a, b) => {
      const dateA = new Date(a.split(',')[1] + ',' + a.split(',')[0]);
      const dateB = new Date(b.split(',')[1] + ',' + b.split(',')[0]);
      return dateA - dateB;
    });
    
    // Day-specific buttons
    uniqueDays.forEach(day => {
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
    
    // Get all unique days from filtered events
    const uniqueDays = [...new Set(filteredEvents.map(event => event.Date))].sort((a, b) => {
      const dateA = new Date(a.split(',')[1] + ',' + a.split(',')[0]);
      const dateB = new Date(b.split(',')[1] + ',' + b.split(',')[0]);
      return dateA - dateB;
    });
    
    // Create groups of events by day
    uniqueDays.forEach(day => {
      eventsByDay[day] = filteredEvents.filter(event => event.Date === day);
    });
    
    // Create sections for days with events
    uniqueDays.forEach(day => {
      const dayEvents = eventsByDay[day];
      
      if (dayEvents.length === 0) return;
      
      // Create day section
      const section = document.createElement('div');
      section.className = 'day-section';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = day;
      section.appendChild(header);
      
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
      
      section.appendChild(content);
      scheduleGrid.appendChild(section);
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
  
  // Show tooltip for an event near the mouse
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
    
    // Calculate position based on mouse pointer
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Make tooltip visible but hidden for measuring
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    tooltip.style.visibility = '';
    
    // Position near the mouse pointer
    let left = e.clientX + 15; // Offset from cursor
    let top = e.clientY + 15;
    
    // Check right edge
    if (left + tooltipWidth > viewportWidth - 10) {
      left = e.clientX - tooltipWidth - 15; // Position to the left of cursor
    }
    
    // Check bottom edge
    if (top + tooltipHeight > viewportHeight - 10) {
      top = e.clientY - tooltipHeight - 15; // Position above cursor
    }
    
    // Ensure tooltip is not off screen
    left = Math.max(10, Math.min(viewportWidth - tooltipWidth - 10, left));
    top = Math.max(10, Math.min(viewportHeight - tooltipHeight - 10, top));
    
    // Apply final position
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
  }
  
  // Get time category based on hour with new ranges
  function getTimeCategory(timeStart) {
    const hour = parseInt(timeStart.split(':')[0]);
    const isPM = timeStart.includes('PM');
    
    let hour24 = hour;
    if (isPM && hour !== 12) hour24 = hour + 12;
    if (!isPM && hour === 12) hour24 = 0;
    
    // Morning: 4:00 AM to 11:59 AM (4-11)
    // Afternoon: 12:00 PM to 4:59 PM (12-16)
    // Evening: 5:00 PM to 3:59 AM (17-23, 0-3)
    
    if ((hour24 >= 4 && hour24 < 12)) return 'morning';
    if (hour24 >= 12 && hour24 < 17) return 'afternoon';
    return 'evening'; // 17-23, 0-3
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