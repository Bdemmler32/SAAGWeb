document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const dayButtonsContainer = document.getElementById('dayButtons');
  const scheduleGrid = document.getElementById('scheduleGrid');
  const noEventsMessage = document.getElementById('noEvents');
  const dateInfo = document.getElementById('date-info');
  const loadingIndicator = document.getElementById('loading');
  const errorMessage = document.getElementById('errorMessage');
  const expandCollapseToggle = document.getElementById('expandCollapseToggle');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  
  // State variables
  let events = [];
  let filteredEvents = [];
  let selectedDay = null;
  let lastUpdated = '';
  
  // Initialize
  fetchScheduleData();
  
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
    title.innerHTML = `<span>${event.Event}</span>`;
    
    // Time display
    const time = document.createElement('div');
    time.className = 'event-time';
    time.textContent = `${event["Time Start"]} - ${event["Time End"]}`;
    
    element.appendChild(title);
    element.appendChild(time);
    
    // Add details for ticketed events
    if (isTicketed) {
      const details = document.createElement('div');
      details.className = 'event-details';
      details.innerHTML = `<div><strong>Event Type:</strong> Ticketed Event</div>`;
      element.appendChild(details);
      
      // Add ticketed badge
      const badge = document.createElement('div');
      badge.className = 'ticketed-badge';
      
      const badgeText = document.createElement('div');
      badgeText.className = 'ticketed-text';
      badgeText.textContent = 'TICKETED';
      
      badge.appendChild(badgeText);
      element.appendChild(badge);
      
      // Add click event for only ticketed events to expand/collapse
      element.addEventListener('click', function() {
        this.classList.toggle('expanded');
      });
    }
    
    return element;
  }
  
  // Expand/Collapse toggle only affects ticketed events
  expandCollapseToggle.addEventListener('change', function() {
    const ticketedEvents = document.querySelectorAll('.event.ticketed');
    
    if (this.checked) {
      // Expand all ticketed events
      ticketedEvents.forEach(event => {
        event.classList.add('expanded');
      });
    } else {
      // Collapse all ticketed events
      ticketedEvents.forEach(event => {
        event.classList.remove('expanded');
      });
    }
  });
  
  // PDF Export functionality
  exportPdfBtn.addEventListener('click', function() {
    // Create a clone of the schedule to modify for PDF export
    const originalContainer = document.getElementById('schedule-container');
    const pdfContainer = originalContainer.cloneNode(true);
    
    // Set the container to a fixed width for PDF export
    pdfContainer.style.width = '1000px';
    pdfContainer.style.maxWidth = 'none';
    pdfContainer.style.margin = '0';
    pdfContainer.style.padding = '20px';
    pdfContainer.style.backgroundColor = 'white';
    
    // Remove filters container (keep only the header)
    const filtersContainer = pdfContainer.querySelector('.filters-container');
    filtersContainer.innerHTML = '';
    filtersContainer.style.display = 'none';
    
    // Clear current schedule grid
    const scheduleGridPdf = pdfContainer.querySelector('#scheduleGrid');
    scheduleGridPdf.innerHTML = '';
    scheduleGridPdf.style.display = 'grid';
    scheduleGridPdf.style.gridTemplateColumns = 'repeat(7, 1fr)';
    scheduleGridPdf.style.gap = '10px';
    
    // Create columns for each day of the week
    const uniqueDays = [...new Set(events.map(event => event.Date))];
    
    // Sort uniqueDays chronologically
    uniqueDays.sort((a, b) => {
      const dateA = new Date(a.split(',')[1] + ',' + a.split(',')[0]);
      const dateB = new Date(b.split(',')[1] + ',' + b.split(',')[0]);
      return dateA - dateB;
    });
    
    // Group events by day
    const eventsByDay = {};
    uniqueDays.forEach(day => {
      eventsByDay[day] = events.filter(event => event.Date === day);
    });
    
    // Create a column for each day
    uniqueDays.forEach(day => {
      const dayEvents = eventsByDay[day];
      
      // Create day column
      const dayColumn = document.createElement('div');
      dayColumn.className = 'day-column';
      dayColumn.style.width = '100%';
      dayColumn.style.overflow = 'hidden';
      dayColumn.style.display = 'flex';
      dayColumn.style.flexDirection = 'column';
      
      // Create day header
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      dayHeader.textContent = day.split(',')[0]; // Just the day name
      dayHeader.style.backgroundColor = '#333';
      dayHeader.style.color = 'white';
      dayHeader.style.padding = '8px';
      dayHeader.style.textAlign = 'center';
      dayHeader.style.borderRadius = '5px 5px 0 0';
      dayHeader.style.fontWeight = 'bold';
      dayColumn.appendChild(dayHeader);
      
      // Create events container
      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'day-events';
      eventsContainer.style.backgroundColor = 'white';
      eventsContainer.style.padding = '5px';
      eventsContainer.style.borderRadius = '0 0 5px 5px';
      eventsContainer.style.flexGrow = '1';
      eventsContainer.style.display = 'flex';
      eventsContainer.style.flexDirection = 'column';
      eventsContainer.style.gap = '5px';
      
      // Sort events by time
      dayEvents.sort((a, b) => {
        return timeToMinutes(a["Time Start"]) - timeToMinutes(b["Time Start"]);
      });
      
      // Add events to container
      dayEvents.forEach(event => {
        const timeCategory = getTimeCategory(event["Time Start"]);
        const isTicketed = event["Ticketed Event"] === "TRUE";
        
        const eventEl = document.createElement('div');
        eventEl.className = `event-pdf ${timeCategory}`;
        eventEl.style.padding = '5px';
        eventEl.style.borderRadius = '4px';
        eventEl.style.fontSize = '10px';
        eventEl.style.position = 'relative';
        eventEl.style.marginBottom = '3px';
        
        // Set background color based on time category
        if (timeCategory === 'morning') {
          eventEl.style.backgroundColor = '#e6f4ff';
          eventEl.style.border = '1px solid #b3d7ff';
        } else if (timeCategory === 'afternoon') {
          eventEl.style.backgroundColor = '#ffede6';
          eventEl.style.border = '1px solid #ffcbb3';
        } else {
          eventEl.style.backgroundColor = '#f0e6ff';
          eventEl.style.border = '1px solid #d6b3ff';
        }
        
        // Add ticketed indicator if needed
        if (isTicketed) {
          eventEl.style.borderRightWidth = '8px';
          eventEl.style.borderRightColor = '#4a7aff';
        }
        
        // Event title
        const titleEl = document.createElement('div');
        titleEl.style.fontWeight = 'bold';
        titleEl.style.marginBottom = '2px';
        titleEl.textContent = event.Event;
        
        // Event time
        const timeEl = document.createElement('div');
        timeEl.style.fontSize = '9px';
        timeEl.textContent = `${event["Time Start"]} - ${event["Time End"]}`;
        
        eventEl.appendChild(titleEl);
        eventEl.appendChild(timeEl);
        eventsContainer.appendChild(eventEl);
      });
      
      dayColumn.appendChild(eventsContainer);
      scheduleGridPdf.appendChild(dayColumn);
    });
    
    // Temporarily add the cloned container to the document for rendering
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    document.body.appendChild(pdfContainer);
    
    // Use html2canvas to capture the container
    html2canvas(pdfContainer, {
      scale: 1.5, // Higher scale for better quality
      useCORS: true,
      logging: false
    }).then(canvas => {
      // Remove the temporary container
      document.body.removeChild(pdfContainer);
      
      // Create PDF in landscape orientation (11x8.5 inches)
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: 'letter'
      });
      
      // Calculate the scaling ratio to fit the canvas to the PDF
      const imgWidth = 11 - 0.5; // Landscape letter width minus margins
      const imgHeight = 8.5 - 0.5; // Landscape letter height minus margins
      const canvasRatio = canvas.height / canvas.width;
      const pdfRatio = imgHeight / imgWidth;
      
      let finalWidth = imgWidth;
      let finalHeight = imgWidth * canvasRatio;
      
      // Adjust if the image is too tall
      if (finalHeight > imgHeight) {
        finalHeight = imgHeight;
        finalWidth = imgHeight / canvasRatio;
      }
      
      // Center the image on the page
      const offsetX = (11 - finalWidth) / 2;
      const offsetY = (8.5 - finalHeight) / 2;
      
      // Add the image to the PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
      
      // Save the PDF
      pdf.save('schedule-at-a-glance.pdf');
    });
  });
  
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