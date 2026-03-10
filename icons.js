// =============================================
//  icons.js — Icon data & API service
//  Replace ICON_API_BASE with your backend URL.
// =============================================

const ICON_API_BASE = "http://localhost:3001/api";

// ---- LOCAL FALLBACK / SAMPLE DATA ----
// Replace or supplement this with a real API call (see fetchIconsFromAPI below).
// Each icon needs: id, name, category, svg (inline SVG string)
const SAMPLE_ICONS = [
  // Arrows
  { id: "arrow-right",    name: "Arrow Right",    category: "Arrows",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>` },
  { id: "arrow-left",     name: "Arrow Left",     category: "Arrows",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>` },
  { id: "arrow-up",       name: "Arrow Up",       category: "Arrows",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>` },
  { id: "arrow-down",     name: "Arrow Down",     category: "Arrows",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>` },
  { id: "chevron-right",  name: "Chevron Right",  category: "Arrows",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>` },
  { id: "refresh",        name: "Refresh",        category: "Arrows",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>` },

  // UI
  { id: "check",          name: "Check",          category: "UI",        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>` },
  { id: "close",          name: "Close",          category: "UI",        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>` },
  { id: "plus",           name: "Plus",           category: "UI",        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>` },
  { id: "minus",          name: "Minus",          category: "UI",        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>` },
  { id: "menu",           name: "Menu",           category: "UI",        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>` },
  { id: "search",         name: "Search",         category: "UI",        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>` },
  { id: "settings",       name: "Settings",       category: "UI",        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>` },
  { id: "filter",         name: "Filter",         category: "UI",        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>` },

  // Communication
  { id: "mail",           name: "Mail",           category: "Communication", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` },
  { id: "phone",          name: "Phone",          category: "Communication", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.18 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>` },
  { id: "chat",           name: "Chat",           category: "Communication", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>` },
  { id: "bell",           name: "Notification",   category: "Communication", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>` },

  // Business
  { id: "chart-bar",      name: "Bar Chart",      category: "Business",  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>` },
  { id: "chart-line",     name: "Line Chart",     category: "Business",  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
  { id: "briefcase",      name: "Briefcase",      category: "Business",  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v4M10 14h4"/></svg>` },
  { id: "dollar",         name: "Dollar",         category: "Business",  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>` },
  { id: "target",         name: "Target",         category: "Business",  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>` },
  { id: "users",          name: "Team",           category: "Business",  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>` },

  // Files
  { id: "file",           name: "File",           category: "Files",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>` },
  { id: "folder",         name: "Folder",         category: "Files",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>` },
  { id: "download",       name: "Download",       category: "Files",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>` },
  { id: "upload",         name: "Upload",         category: "Files",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>` },
  { id: "trash",          name: "Delete",         category: "Files",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>` },

  // People & Identity
  { id: "user",           name: "User",           category: "People",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
  { id: "lock",           name: "Lock",           category: "People",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>` },
  { id: "key",            name: "Key",            category: "People",    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>` },

  // Media
  { id: "image",          name: "Image",          category: "Media",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>` },
  { id: "video",          name: "Video",          category: "Media",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>` },
  { id: "music",          name: "Music",          category: "Media",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>` },
  { id: "mic",            name: "Microphone",     category: "Media",     svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>` },
  { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<?xml version="1.0" encoding="UTF-8"?>
    <svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
      { id: "obesity", name: "Obesity", category: "Custom", svg: `<?xml version="1.0" encoding="UTF-8"?>
    <svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240.88 2038.64">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 41.51px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <g>
          <path class="cls-1" d="M263.76,770.5h0c-124.72,218.29-151.56,479.07-73.92,718.19l138.2,425.61c20.05,61.76,77.6,103.58,142.53,103.58h0c82.76,0,149.86-67.09,149.86-149.86v-558.12h0v558.12c0,82.76,67.09,149.86,149.86,149.86h0c64.93,0,122.48-41.82,142.53-103.58l138.2-425.61c77.64-239.12,50.8-499.9-73.92-718.19h0"/>
          <line class="cls-1" x1="559.84" y1="1309.41" x2="681.01" y2="1309.41"/>
          <path class="cls-1" d="M760.13,361.95l24.28,4.99c181.43,37.01,322.63,179.77,357.78,361.5l75.88,392.34c1.37,7.25,2.06,14.39,2.06,21.54,0,49.15-32.02,93.9-80.68,108.59-15.37,4.6-30.94,5.68-45.73,3.52"/>
          <path class="cls-1" d="M147.19,1254.44c-4.8.69-9.69,1.08-14.69,1.08-10.28,0-20.76-1.47-31.14-4.6-55.61-16.84-89.59-73.04-78.53-130.13l75.79-392.34c35.15-181.73,176.44-324.49,357.88-361.5l24.28-4.99"/>
          <circle class="cls-1" cx="620.43" cy="219.97" r="199.17"/>
        </g>
      </g>
    </svg>` },
      { id: "scales", name: "Scales", category: "Custom", svg: `<?xml version="1.0" encoding="UTF-8"?>
    <svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426 477.99">
      <defs>
        <style>
          .cls-1 {
            stroke-linecap: round;
          }
    
          .cls-1, .cls-2 {
            fill: #fff;
            stroke: #000;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-2" d="M416,110.88v308.23c0,27-21.88,48.88-48.88,48.88H58.89c-27,0-48.89-21.89-48.89-48.89V110.88c0-27,21.89-48.89,48.89-48.89h47.51c-18.88,23.62-30.16,53.57-30.16,86.16,0,18.7,3.71,36.52,10.44,52.78,3.86,9.33,13.05,15.33,23.15,15.33h209.15c10.09,0,19.29-6,23.15-15.33,6.73-16.25,10.44-34.08,10.44-52.78,0-32.59-11.28-62.54-30.16-86.16h44.71c27,0,48.89,21.89,48.89,48.89Z"/>
        <path class="cls-2" d="M352.56,148.15c0,16.17-2.78,31.68-7.87,46.09-4.66,13.17-17.07,22.02-31.05,22.02H115.16c-13.98,0-26.39-8.85-31.05-22.02-5.1-14.41-7.87-29.92-7.87-46.09,0-32.59,11.28-62.54,30.16-86.16,25.31-31.69,64.29-51.99,108-51.99s82.69,20.3,108,51.99c18.88,23.62,30.16,53.57,30.16,86.16Z"/>
        <line class="cls-1" x1="214.4" y1="216.26" x2="264.37" y2="105.86"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
      { id: "obesity", name: "Obesity", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240.88 2038.64">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 41.51px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <g>
          <path class="cls-1" d="M263.76,770.5h0c-124.72,218.29-151.56,479.07-73.92,718.19l138.2,425.61c20.05,61.76,77.6,103.58,142.53,103.58h0c82.76,0,149.86-67.09,149.86-149.86v-558.12h0v558.12c0,82.76,67.09,149.86,149.86,149.86h0c64.93,0,122.48-41.82,142.53-103.58l138.2-425.61c77.64-239.12,50.8-499.9-73.92-718.19h0"/>
          <line class="cls-1" x1="559.84" y1="1309.41" x2="681.01" y2="1309.41"/>
          <path class="cls-1" d="M760.13,361.95l24.28,4.99c181.43,37.01,322.63,179.77,357.78,361.5l75.88,392.34c1.37,7.25,2.06,14.39,2.06,21.54,0,49.15-32.02,93.9-80.68,108.59-15.37,4.6-30.94,5.68-45.73,3.52"/>
          <path class="cls-1" d="M147.19,1254.44c-4.8.69-9.69,1.08-14.69,1.08-10.28,0-20.76-1.47-31.14-4.6-55.61-16.84-89.59-73.04-78.53-130.13l75.79-392.34c35.15-181.73,176.44-324.49,357.88-361.5l24.28-4.99"/>
          <circle class="cls-1" cx="620.43" cy="219.97" r="199.17"/>
        </g>
      </g>
    </svg>` },
      { id: "scales", name: "Scales", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426 477.99">
      <defs>
        <style>
          .cls-1 {
            stroke-linecap: round;
          }
    
          .cls-1, .cls-2 {
            fill: #fff;
            stroke: #000;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-2" d="M416,110.88v308.23c0,27-21.88,48.88-48.88,48.88H58.89c-27,0-48.89-21.89-48.89-48.89V110.88c0-27,21.89-48.89,48.89-48.89h47.51c-18.88,23.62-30.16,53.57-30.16,86.16,0,18.7,3.71,36.52,10.44,52.78,3.86,9.33,13.05,15.33,23.15,15.33h209.15c10.09,0,19.29-6,23.15-15.33,6.73-16.25,10.44-34.08,10.44-52.78,0-32.59-11.28-62.54-30.16-86.16h44.71c27,0,48.89,21.89,48.89,48.89Z"/>
        <path class="cls-2" d="M352.56,148.15c0,16.17-2.78,31.68-7.87,46.09-4.66,13.17-17.07,22.02-31.05,22.02H115.16c-13.98,0-26.39-8.85-31.05-22.02-5.1-14.41-7.87-29.92-7.87-46.09,0-32.59,11.28-62.54,30.16-86.16,25.31-31.69,64.29-51.99,108-51.99s82.69,20.3,108,51.99c18.88,23.62,30.16,53.57,30.16,86.16Z"/>
        <line class="cls-1" x1="214.4" y1="216.26" x2="264.37" y2="105.86"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
      { id: "obesity", name: "Obesity", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240.88 2038.64">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 41.51px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <g>
          <path class="cls-1" d="M263.76,770.5h0c-124.72,218.29-151.56,479.07-73.92,718.19l138.2,425.61c20.05,61.76,77.6,103.58,142.53,103.58h0c82.76,0,149.86-67.09,149.86-149.86v-558.12h0v558.12c0,82.76,67.09,149.86,149.86,149.86h0c64.93,0,122.48-41.82,142.53-103.58l138.2-425.61c77.64-239.12,50.8-499.9-73.92-718.19h0"/>
          <line class="cls-1" x1="559.84" y1="1309.41" x2="681.01" y2="1309.41"/>
          <path class="cls-1" d="M760.13,361.95l24.28,4.99c181.43,37.01,322.63,179.77,357.78,361.5l75.88,392.34c1.37,7.25,2.06,14.39,2.06,21.54,0,49.15-32.02,93.9-80.68,108.59-15.37,4.6-30.94,5.68-45.73,3.52"/>
          <path class="cls-1" d="M147.19,1254.44c-4.8.69-9.69,1.08-14.69,1.08-10.28,0-20.76-1.47-31.14-4.6-55.61-16.84-89.59-73.04-78.53-130.13l75.79-392.34c35.15-181.73,176.44-324.49,357.88-361.5l24.28-4.99"/>
          <circle class="cls-1" cx="620.43" cy="219.97" r="199.17"/>
        </g>
      </g>
    </svg>` },
      { id: "scales", name: "Scales", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426 477.99">
      <defs>
        <style>
          .cls-1 {
            stroke-linecap: round;
          }
    
          .cls-1, .cls-2 {
            fill: #fff;
            stroke: #000;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-2" d="M416,110.88v308.23c0,27-21.88,48.88-48.88,48.88H58.89c-27,0-48.89-21.89-48.89-48.89V110.88c0-27,21.89-48.89,48.89-48.89h47.51c-18.88,23.62-30.16,53.57-30.16,86.16,0,18.7,3.71,36.52,10.44,52.78,3.86,9.33,13.05,15.33,23.15,15.33h209.15c10.09,0,19.29-6,23.15-15.33,6.73-16.25,10.44-34.08,10.44-52.78,0-32.59-11.28-62.54-30.16-86.16h44.71c27,0,48.89,21.89,48.89,48.89Z"/>
        <path class="cls-2" d="M352.56,148.15c0,16.17-2.78,31.68-7.87,46.09-4.66,13.17-17.07,22.02-31.05,22.02H115.16c-13.98,0-26.39-8.85-31.05-22.02-5.1-14.41-7.87-29.92-7.87-46.09,0-32.59,11.28-62.54,30.16-86.16,25.31-31.69,64.29-51.99,108-51.99s82.69,20.3,108,51.99c18.88,23.62,30.16,53.57,30.16,86.16Z"/>
        <line class="cls-1" x1="214.4" y1="216.26" x2="264.37" y2="105.86"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
    { id: "scales", name: "Scales", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426 477.99">
      <defs>
        <style>
          .cls-1 {
            stroke-linecap: round;
          }
    
          .cls-1, .cls-2 {
            fill: #fff;
            stroke: #000;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-2" d="M416,110.88v308.23c0,27-21.88,48.88-48.88,48.88H58.89c-27,0-48.89-21.89-48.89-48.89V110.88c0-27,21.89-48.89,48.89-48.89h47.51c-18.88,23.62-30.16,53.57-30.16,86.16,0,18.7,3.71,36.52,10.44,52.78,3.86,9.33,13.05,15.33,23.15,15.33h209.15c10.09,0,19.29-6,23.15-15.33,6.73-16.25,10.44-34.08,10.44-52.78,0-32.59-11.28-62.54-30.16-86.16h44.71c27,0,48.89,21.89,48.89,48.89Z"/>
        <path class="cls-2" d="M352.56,148.15c0,16.17-2.78,31.68-7.87,46.09-4.66,13.17-17.07,22.02-31.05,22.02H115.16c-13.98,0-26.39-8.85-31.05-22.02-5.1-14.41-7.87-29.92-7.87-46.09,0-32.59,11.28-62.54,30.16-86.16,25.31-31.69,64.29-51.99,108-51.99s82.69,20.3,108,51.99c18.88,23.62,30.16,53.57,30.16,86.16Z"/>
        <line class="cls-1" x1="214.4" y1="216.26" x2="264.37" y2="105.86"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 20px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 18.20375px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 29.126px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 43.689px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 291.26 315.56">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 18.963124999999998px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <g transform="translate(0.9240714919508175, 0) scale(0.07605526682722778)">
    
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 1.5px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
      </g>
    </svg>` },
    { id: "fatigue", name: "Fatigue", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <g transform="translate(0.9240714919508175, 0) scale(0.07605526682722778)">
    
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 19.7225px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <path class="cls-1" d="M74.97,63.56l121.19,121.19M192.9,105.04v-3.48c0-5.53-2.2-10.83-6.11-14.74-3.91-3.91-9.21-6.11-14.74-6.11h-93.81c-5.53,0-10.83,2.2-14.74,6.11-3.91,3.91-6.11,9.21-6.11,14.74v45.17c0,5.53,2.2,10.83,6.11,14.74,3.91,3.91,9.21,6.11,14.74,6.11h93.81c5.53,0,10.83-2.2,14.74-6.11,3.91-3.91,6.11-9.21,6.11-14.74v-3.47h10.42c2.77,0,5.42-1.1,7.37-3.05,1.95-1.95,3.05-4.61,3.05-7.37v-17.37c0-2.76-1.1-5.42-3.05-7.37-1.95-1.95-4.61-3.05-7.37-3.05h-10.42ZM49.41,305.56v-82.3c-18.15-16.81-30.81-38.71-36.32-62.83-5.51-24.12-3.62-49.34,5.42-72.37,9.04-23.03,24.82-42.8,45.27-56.72,20.45-13.92,44.63-21.36,69.37-21.33,93.78,0,114.02,77.21,147.45,163.93.57,1.49.77,3.1.59,4.69-.19,1.59-.76,3.11-1.66,4.43-.91,1.32-2.12,2.4-3.53,3.14-1.41.75-2.99,1.14-4.59,1.14h-24.96v39.41c0,10.45-4.15,20.47-11.54,27.86-7.39,7.39-17.41,11.54-27.86,11.54h-19.7v39.41"/>
      </g>
      </g>
    </svg>` },
    { id: "obesity", name: "Obesity", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <g transform="translate(4.7215031863872285, 0) scale(0.026279482294198804)">
    
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 57.07875px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <g>
          <path class="cls-1" d="M131.38,345.97h0c-36.97,99.55-44.68,207.59-22.21,311.38l41.82,193.2c6.34,29.31,32.27,50.22,62.26,50.22h0c35.18,0,63.7-28.52,63.7-63.7v-260.36h0v260.36c0,35.18,28.52,63.7,63.7,63.7h0c29.99,0,55.91-20.91,62.26-50.22l41.82-193.2c22.47-103.78,14.76-211.83-22.21-311.38h0"/>
          <path class="cls-1" d="M325.6,175.12c6.27.91,12.54,2.05,18.77,3.31,71.68,14.68,128.77,68.76,147.28,139.57l48.25,184.39c1.05,4.01,1.52,8.01,1.52,11.98,0,20.38-13.24,39.06-33.62,45.25-19.07,5.75-38.85-.96-50.52-15.5"/>
          <path class="cls-1" d="M96.67,544.06c-8.84,11.06-22.38,17.59-36.71,17.59-4.57,0-9.23-.65-13.85-2.05-24.34-7.36-38.5-32.62-32.05-57.22l48.21-184.39c9.23-35.41,28.18-66.63,53.74-90.84,25.52-24.21,57.75-41.37,93.59-48.73,6.23-1.26,12.45-2.39,18.73-3.27"/>
          <circle class="cls-1" cx="276.95" cy="101.11" r="88.58" transform="translate(9.62 225.45) rotate(-45)"/>
        </g>
      </g>
      </g>
    </svg>` },
    { id: "obesity", name: "Obesity", category: "Custom", svg: `<svg overflow="visible" id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <g transform="translate(4.7215031863872285, 0) scale(0.026279482294198804)">
    
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 1.5px; vector-effect: non-scaling-stroke;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <g>
          <path class="cls-1" d="M131.38,345.97h0c-36.97,99.55-44.68,207.59-22.21,311.38l41.82,193.2c6.34,29.31,32.27,50.22,62.26,50.22h0c35.18,0,63.7-28.52,63.7-63.7v-260.36h0v260.36c0,35.18,28.52,63.7,63.7,63.7h0c29.99,0,55.91-20.91,62.26-50.22l41.82-193.2c22.47-103.78,14.76-211.83-22.21-311.38h0"/>
          <path class="cls-1" d="M325.6,175.12c6.27.91,12.54,2.05,18.77,3.31,71.68,14.68,128.77,68.76,147.28,139.57l48.25,184.39c1.05,4.01,1.52,8.01,1.52,11.98,0,20.38-13.24,39.06-33.62,45.25-19.07,5.75-38.85-.96-50.52-15.5"/>
          <path class="cls-1" d="M96.67,544.06c-8.84,11.06-22.38,17.59-36.71,17.59-4.57,0-9.23-.65-13.85-2.05-24.34-7.36-38.5-32.62-32.05-57.22l48.21-184.39c9.23-35.41,28.18-66.63,53.74-90.84,25.52-24.21,57.75-41.37,93.59-48.73,6.23-1.26,12.45-2.39,18.73-3.27"/>
          <circle class="cls-1" cx="276.95" cy="101.11" r="88.58" transform="translate(9.62 225.45) rotate(-45)"/>
        </g>
      </g>
      </g>
    </svg>` },
    { id: "obesity", name: "Obesity", category: "Custom", svg: `<svg overflow="visible" id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <g transform="translate(4.7215031863872285, 0) scale(0.026279482294198804)">
    
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 57.07875px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <g>
          <path class="cls-1" d="M131.38,345.97h0c-36.97,99.55-44.68,207.59-22.21,311.38l41.82,193.2c6.34,29.31,32.27,50.22,62.26,50.22h0c35.18,0,63.7-28.52,63.7-63.7v-260.36h0v260.36c0,35.18,28.52,63.7,63.7,63.7h0c29.99,0,55.91-20.91,62.26-50.22l41.82-193.2c22.47-103.78,14.76-211.83-22.21-311.38h0"/>
          <path class="cls-1" d="M325.6,175.12c6.27.91,12.54,2.05,18.77,3.31,71.68,14.68,128.77,68.76,147.28,139.57l48.25,184.39c1.05,4.01,1.52,8.01,1.52,11.98,0,20.38-13.24,39.06-33.62,45.25-19.07,5.75-38.85-.96-50.52-15.5"/>
          <path class="cls-1" d="M96.67,544.06c-8.84,11.06-22.38,17.59-36.71,17.59-4.57,0-9.23-.65-13.85-2.05-24.34-7.36-38.5-32.62-32.05-57.22l48.21-184.39c9.23-35.41,28.18-66.63,53.74-90.84,25.52-24.21,57.75-41.37,93.59-48.73,6.23-1.26,12.45-2.39,18.73-3.27"/>
          <circle class="cls-1" cx="276.95" cy="101.11" r="88.58" transform="translate(9.62 225.45) rotate(-45)"/>
        </g>
      </g>
      </g>
    </svg>` },
    { id: "obesity", name: "Obesity", category: "Custom", svg: `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 553.93 913.26">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 45.8496875px;
          }
        </style>
      </defs>
      <g id="_ÎÓÈ_1" data-name="—ÎÓÈ_1">
        <g>
          <path class="cls-1" d="M131.38,345.97h0c-36.97,99.55-44.68,207.59-22.21,311.38l41.82,193.2c6.34,29.31,32.27,50.22,62.26,50.22h0c35.18,0,63.7-28.52,63.7-63.7v-260.36h0v260.36c0,35.18,28.52,63.7,63.7,63.7h0c29.99,0,55.91-20.91,62.26-50.22l41.82-193.2c22.47-103.78,14.76-211.83-22.21-311.38h0"/>
          <path class="cls-1" d="M325.6,175.12c6.27.91,12.54,2.05,18.77,3.31,71.68,14.68,128.77,68.76,147.28,139.57l48.25,184.39c1.05,4.01,1.52,8.01,1.52,11.98,0,20.38-13.24,39.06-33.62,45.25-19.07,5.75-38.85-.96-50.52-15.5"/>
          <path class="cls-1" d="M96.67,544.06c-8.84,11.06-22.38,17.59-36.71,17.59-4.57,0-9.23-.65-13.85-2.05-24.34-7.36-38.5-32.62-32.05-57.22l48.21-184.39c9.23-35.41,28.18-66.63,53.74-90.84,25.52-24.21,57.75-41.37,93.59-48.73,6.23-1.26,12.45-2.39,18.73-3.27"/>
          <circle class="cls-1" cx="276.95" cy="101.11" r="88.58" transform="translate(9.62 225.45) rotate(-45)"/>
        </g>
      </g>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1, .cls-2 {
            fill: none;
          }
    
          .cls-2 {
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <g id="Guides">
        <g>
          <path class="cls-2" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
          <path class="cls-2" d="M13.05,5.66c.14.02.28.05.42.07,1.61.33,2.9,1.55,3.32,3.14l1.09,4.15c.02.09.03.18.03.27,0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35"/>
          <path class="cls-2" d="M7.9,13.97c-.2.25-.5.4-.83.4-.1,0-.21-.01-.31-.05-.55-.17-.87-.73-.72-1.29l1.09-4.15c.21-.8.63-1.5,1.21-2.05.57-.55,1.3-.93,2.11-1.1.14-.03.28-.05.42-.07"/>
          <circle class="cls-2" cx="11.95" cy="4" r="1.99"/>
        </g>
      </g>
      <g id="Bounding_Box" data-name="Bounding Box">
        <rect class="cls-1" width="24" height="24"/>
      </g>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1, .cls-2 {
            fill: none;
          }
    
          .cls-2 {
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <g id="Guides">
        <g>
          <path class="cls-2" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
          <path class="cls-2" d="M13.05,5.66c.14.02.28.05.42.07,1.61.33,2.9,1.55,3.32,3.14l1.09,4.15c.02.09.03.18.03.27,0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35"/>
          <path class="cls-2" d="M7.9,13.97c-.2.25-.5.4-.83.4-.1,0-.21-.01-.31-.05-.55-.17-.87-.73-.72-1.29l1.09-4.15c.21-.8.63-1.5,1.21-2.05.57-.55,1.3-.93,2.11-1.1.14-.03.28-.05.42-.07"/>
          <circle class="cls-2" cx="11.95" cy="4" r="1.99"/>
        </g>
      </g>
      <g id="Bounding_Box" data-name="Bounding Box">
        <rect class="cls-1" width="24" height="24"/>
      </g>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <path class="cls-1" d="M13.05,5.66c.14.02.28.05.42.07,1.61.33,2.9,1.55,3.32,3.14l1.09,4.15c.02.09.03.18.03.27,0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35"/>
      <path class="cls-1" d="M7.9,13.97c-.2.25-.5.4-.83.4-.1,0-.21-.01-.31-.05-.55-.17-.87-.73-.72-1.29l1.09-4.15c.21-.8.63-1.5,1.21-2.05.57-.55,1.3-.93,2.11-1.1.14-.03.28-.05.42-.07"/>
      <circle class="cls-1" cx="11.95" cy="4" r="1.99"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <path class="cls-1" d="M13.05,5.66c.14.02.28.05.42.07,1.61.33,2.9,1.55,3.32,3.14l1.09,4.15c.02.09.03.18.03.27,0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35"/>
      <path class="cls-1" d="M7.9,13.97c-.2.25-.5.4-.83.4-.1,0-.21-.01-.31-.05-.55-.17-.87-.73-.72-1.29l1.09-4.15c.21-.8.63-1.5,1.21-2.05.57-.55,1.3-.93,2.11-1.1.14-.03.28-.05.42-.07"/>
      <circle class="cls-1" cx="11.95" cy="4" r="1.99"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <path class="cls-1" d="M13.05,5.66c.14.02.28.05.42.07,1.61.33,2.9,1.55,3.32,3.14l1.09,4.15c.02.09.03.18.03.27,0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35"/>
      <path class="cls-1" d="M7.9,13.97c-.2.25-.5.4-.83.4-.1,0-.21-.01-.31-.05-.55-.17-.87-.73-.72-1.29l1.09-4.15c.21-.8.63-1.5,1.21-2.05.57-.55,1.3-.93,2.11-1.1.14-.03.28-.05.42-.07"/>
      <circle class="cls-1" cx="11.95" cy="4" r="1.99"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <path class="cls-1" d="M13.05,5.66c.14.02.28.05.42.07,1.61.33,2.9,1.55,3.32,3.14l1.09,4.15c.02.09.03.18.03.27,0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35"/>
      <path class="cls-1" d="M7.9,13.97c-.2.25-.5.4-.83.4-.1,0-.21-.01-.31-.05-.55-.17-.87-.73-.72-1.29l1.09-4.15c.21-.8.63-1.5,1.21-2.05.57-.55,1.3-.93,2.11-1.1.14-.03.28-.05.42-.07"/>
      <circle class="cls-1" cx="11.95" cy="4" r="1.99"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <path class="cls-1" d="M13.05,5.66c.14.02.28.05.42.07,1.61.33,2.9,1.55,3.32,3.14l1.09,4.15c.02.09.03.18.03.27,0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35"/>
      <path class="cls-1" d="M7.9,13.97c-.2.25-.5.4-.83.4-.1,0-.21-.01-.31-.05-.55-.17-.87-.73-.72-1.29l1.09-4.15c.21-.8.63-1.5,1.21-2.05.57-.55,1.3-.93,2.11-1.1.14-.03.28-.05.42-.07"/>
      <circle class="cls-1" cx="11.95" cy="4" r="1.99"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-1" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-1" d="M7.89,13.98c-.01-1.52.25-3.03.79-4.47"/>
      <path class="cls-1" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <line class="cls-1" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: #ff0;
          }
    
          .cls-1, .cls-2 {
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
    
          .cls-2 {
            fill: none;
          }
        </style>
      </defs>
      <path class="cls-2" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <path class="cls-1" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-1" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-1" d="M7.89,13.98c-.01-1.52.25-3.03.79-4.47"/>
      <line class="cls-1" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: #1d1d1b;
          }
    
          .cls-2 {
            fill: #ff0;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M11.95,2c.78,0,1.53.46,1.85,1.23.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27,0,.46-.3.88-.76,1.02-.1.03-.21.05-.31.05-.32,0-.62-.15-.83-.4-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61.25-.1.51-.15.76-.15M11.95,1h0c-.39,0-.78.08-1.14.23-1.51.64-2.24,2.36-1.64,3.87-.55.24-1.07.58-1.52,1-.73.69-1.24,1.56-1.5,2.53l-1.08,4.15c-.29,1.06.32,2.17,1.39,2.5.16.05.33.08.51.08.05.46.13.91.23,1.37l.94,4.35c.24,1.13,1.22,1.92,2.38,1.92.54,0,1.03-.17,1.43-.47.4.29.9.47,1.44.47,1.14,0,2.14-.81,2.38-1.92l.94-4.35c.1-.45.17-.9.22-1.37.17,0,.34-.04.51-.09.88-.27,1.47-1.06,1.47-1.98,0-.16-.02-.33-.05-.49l-1.1-4.19c-.42-1.61-1.54-2.89-3.02-3.53.28-.7.29-1.51-.02-2.25-.47-1.12-1.56-1.85-2.77-1.85h0Z"/>
      <line class="cls-2" x1="11.95" y1="22" x2="11.95" y2="14.7"/>
      <path class="cls-2" d="M7.92,13.97c-.01-1.52.25-3.03.79-4.47"/>
      <path class="cls-2" d="M15.22,9.5c.54,1.44.8,2.95.79,4.47"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-1" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-1" d="M7.89,13.98c-.01-1.52.25-3.03.79-4.47"/>
      <path class="cls-1" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <line class="cls-1" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <path class="cls-1" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-1" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-1" d="M7.89,13.98c-.01-1.52.25-3.03.79-4.47"/>
      <line class="cls-1" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <path class="cls-1" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-1" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-1" d="M7.89,13.98c-.01-1.52.25-3.03.79-4.47"/>
      <line class="cls-1" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
      <path class="cls-1" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <circle class="cls-1" cx="11.95" cy="4" r="1.99"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <path class="cls-1" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-1" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-1" d="M7.89,13.98c-.01-1.52.25-3.03.79-4.47"/>
      <line class="cls-1" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
      <path class="cls-1" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <circle class="cls-1" cx="11.95" cy="4" r="1.99"/>
    </svg>` },
    { id: "colours-gm-filled-24px-copy", name: "Colours gm filled 24px copy", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: #1d1d1b;
          }
    
          .cls-2 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-2" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <path class="cls-2" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-2" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-2" d="M7.89,13.98c0-1.52.25-3.03.79-4.47"/>
      <line class="cls-2" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
      <path class="cls-2" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <circle class="cls-2" cx="11.95" cy="4" r="1.99"/>
      <polyline class="cls-2" points="13.55 5.73 14.04 10.01 9.87 10.01 10.35 5.73"/>
      <path class="cls-1" d="M14.87,5.21c-.29.29-.84.27-.84.27,0,0-.01-.55.27-.84s.84-.27.84-.27c0,0,.01.55-.27.84Z"/>
      <path class="cls-1" d="M9.03,5.21c.29.29.84.27.84.27,0,0,.01-.55-.27-.84s-.84-.27-.84-.27c0,0-.01.55.27.84Z"/>
    </svg>` },
    { id: "colours-gm-filled-24px-copy", name: "Colours gm filled 24px copy", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: #1d1d1b;
          }
    
          .cls-2 {
            fill: none;
            stroke-width: 1.5;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-2" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <path class="cls-2" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-2" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-2" d="M7.89,13.98c0-1.52.25-3.03.79-4.47"/>
      <line class="cls-2" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
      <path class="cls-2" d="M14.04,10.01h-4.17l.48-4.28h.64c.51.3,1.15.35,1.73.11.07-.03.14-.06.21-.11h.62l.49,4.28Z"/>
      <path class="cls-2" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <path class="cls-2" d="M12.93,5.73c-.07.05-.14.08-.21.11-.58.24-1.22.19-1.73-.11-.38-.2-.7-.54-.88-.97-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.39.94,0,2.01-.87,2.5Z"/>
      <path class="cls-1" d="M14.87,5.21c-.29.29-.84.27-.84.27,0,0-.01-.55.27-.84s.84-.27.84-.27c0,0,.01.55-.27.84Z"/>
      <path class="cls-1" d="M9.03,5.21c.29.29.84.27.84.27,0,0,.01-.55-.27-.84s-.84-.27-.84-.27c0,0-.01.55.27.84Z"/>
    </svg>` },
    { id: "colours-gm-filled-24px", name: "Colours gm filled 24px", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 1;
                stroke: #1d1d1b;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M17.91,13.3c0,.46-.3.88-.76,1.02-.43.13-.87-.02-1.14-.35-.01.86-.1,1.71-.28,2.55l-.94,4.35c-.14.66-.73,1.13-1.4,1.13-.79,0-1.44-.64-1.44-1.43,0,.79-.64,1.43-1.43,1.43-.68,0-1.26-.47-1.4-1.13l-.94-4.35c-.18-.84-.28-1.69-.29-2.54-.2.24-.5.38-.82.38-.1,0-.21-.01-.31-.04-.55-.17-.87-.74-.72-1.29l1.08-4.15c.21-.8.63-1.5,1.21-2.05.58-.54,1.3-.93,2.11-1.09.14-.03.28-.06.42-.08-.32-.21-.59-.52-.75-.9-.42-1.01.06-2.18,1.08-2.61,1.01-.42,2.18.06,2.61,1.08.37.89.04,1.91-.75,2.43.14.02.28.05.42.08,1.62.33,2.9,1.54,3.32,3.14l1.09,4.15c.02.09.03.18.03.27Z"/>
      <path class="cls-1" d="M15.23,9.51c.53,1.43.8,2.95.78,4.46"/>
      <line class="cls-1" x1="11.95" y1="20.57" x2="11.95" y2="14.7"/>
      <path class="cls-1" d="M7.89,13.98c-.01-1.52.25-3.03.79-4.47"/>
      <line class="cls-1" x1="7.9" y1="13.97" x2="7.89" y2="13.98"/>
      <path class="cls-1" d="M8.68,9.51h0c-.83,2.24-1.01,4.67-.5,7.01l.94,4.35c.14.66.73,1.13,1.4,1.13h0c.79,0,1.43-.64,1.43-1.43v-5.86h0v5.86c0,.79.64,1.43,1.43,1.43h0c.68,0,1.26-.47,1.4-1.13l.94-4.35c.51-2.34.33-4.77-.5-7.01h0"/>
      <circle class="cls-1" cx="11.95" cy="4" r="1.99"/>
    </svg>` },
    { id: "mc4r-pathway-diseases-", name: "MC4R pathway diseases   ", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: #fff;
          }
    
          .cls-1, .cls-2 {
            stroke-width: 1;
                stroke: #141212;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
    
          .cls-2 {
            fill: none;
          }
        </style>
      </defs>
      <path class="cls-2" d="M6.01,15.03c-1.21.05-2.28-.74-2.76-1.75-.05-.12-.64-1.42.05-2.67.31-.57.76-.9,1-1.05,0-.37.05-1.7,1.06-2.8.31-.35,1.19-1.31,2.53-1.23,1.29.08,2.07,1.06,2.19,1.23"/>
      <path class="cls-2" d="M10.07,16.34c1,.29,1.84.07,2.16-.04.18.18.5.46.96.66.49.21.92.25,1.19.26.29.78.59,1.57.89,2.35"/>
      <path class="cls-2" d="M8.2,5.55c.77-.42,2.57-1.26,4.95-1.11,1.93.12,3.28.87,3.98,1.23,0,0,2.3,1.26,3.87,3.77.61.97.67,1.44.64,1.8-.06.84-.63,1.08-.64,2.01-.01.7.29.79.29,1.49,0,.95-.57,1.66-.74,1.88-1.12,1.4-3,1.37-3.24,1.36-.06.5-.12.99-.18,1.49"/>
      <path class="cls-2" d="M13.54,8.81c-.12-.28-.43-1.11-.19-2.15.25-1.08.93-1.71,1.16-1.9"/>
      <path class="cls-2" d="M16.68,8.53c.21-.02.63-.1,1.05-.41.66-.5.78-1.24.8-1.4"/>
      <path class="cls-2" d="M17.23,15.3c-.03-.16-.27-1.58-1.57-2.26-1.08-.57-2.45-.4-3.44.44"/>
      <path class="cls-2" d="M15.22,9.72c.2.14.61.47.83,1.05.43,1.15-.32,2.19-.39,2.28"/>
      <path class="cls-2" d="M12.39,10.54c-.22,0-.83-.01-1.43-.41-.53-.35-.78-.81-.88-1.02"/>
      <path class="cls-2" d="M11.18,7.87c-.15.26-.44.7-.96,1.05-.91.61-1.86.53-2.15.5"/>
      <path class="cls-2" d="M19.57,10.68c-.59.2-1.17.4-1.76.61"/>
      <circle class="cls-1" cx="8.31" cy="14.84" r="2.31"/>
      <circle class="cls-2" cx="8.31" cy="14.84" r="0"/>
    </svg>` },
    { id: "mc4r-pathway-diseases-", name: "MC4R pathway diseases   ", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: #fff;
          }
    
          .cls-1, .cls-2 {
            stroke-width: 1;
                stroke: #141212;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
    
          .cls-2 {
            fill: none;
          }
        </style>
      </defs>
      <path class="cls-2" d="M6.01,15.03c-1.21.05-2.28-.74-2.76-1.75-.05-.12-.64-1.42.05-2.67.31-.57.76-.9,1-1.05,0-.37.05-1.7,1.06-2.8.31-.35,1.19-1.31,2.53-1.23,1.29.08,2.07,1.06,2.19,1.23"/>
      <path class="cls-2" d="M10.07,16.34c1,.29,1.84.07,2.16-.04.18.18.5.46.96.66.49.21.92.25,1.19.26.29.78.59,1.57.89,2.35"/>
      <path class="cls-2" d="M8.2,5.55c.77-.42,2.57-1.26,4.95-1.11,1.93.12,3.28.87,3.98,1.23,0,0,2.3,1.26,3.87,3.77.61.97.67,1.44.64,1.8-.06.84-.63,1.08-.64,2.01-.01.7.29.79.29,1.49,0,.95-.57,1.66-.74,1.88-1.12,1.4-3,1.37-3.24,1.36-.06.5-.12.99-.18,1.49"/>
      <path class="cls-2" d="M13.54,8.81c-.12-.28-.43-1.11-.19-2.15.25-1.08.93-1.71,1.16-1.9"/>
      <path class="cls-2" d="M16.68,8.53c.21-.02.63-.1,1.05-.41.66-.5.78-1.24.8-1.4"/>
      <path class="cls-2" d="M17.23,15.3c-.03-.16-.27-1.58-1.57-2.26-1.08-.57-2.45-.4-3.44.44"/>
      <path class="cls-2" d="M15.22,9.72c.2.14.61.47.83,1.05.43,1.15-.32,2.19-.39,2.28"/>
      <path class="cls-2" d="M12.39,10.54c-.22,0-.83-.01-1.43-.41-.53-.35-.78-.81-.88-1.02"/>
      <path class="cls-2" d="M11.18,7.87c-.15.26-.44.7-.96,1.05-.91.61-1.86.53-2.15.5"/>
      <path class="cls-2" d="M19.57,10.68c-.59.2-1.17.4-1.76.61"/>
      <circle class="cls-1" cx="8.31" cy="14.84" r="2.31"/>
      <circle class="cls-2" cx="8.33" cy="14.86" r=".5"/>
    </svg>` },
    { id: "mc4r-pathway-diseases-", name: "MC4R pathway diseases   ", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: #fff;
          }
    
          .cls-1, .cls-2 {
            stroke-width: 2;
                stroke: #141212;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
    
          .cls-2 {
            fill: none;
          }
        </style>
      </defs>
      <path class="cls-2" d="M6.01,15.03c-1.21.05-2.28-.74-2.76-1.75-.05-.12-.64-1.42.05-2.67.31-.57.76-.9,1-1.05,0-.37.05-1.7,1.06-2.8.31-.35,1.19-1.31,2.53-1.23,1.29.08,2.07,1.06,2.19,1.23"/>
      <path class="cls-2" d="M10.07,16.34c1,.29,1.84.07,2.16-.04.18.18.5.46.96.66.49.21.92.25,1.19.26.29.78.59,1.57.89,2.35"/>
      <path class="cls-2" d="M8.2,5.55c.77-.42,2.57-1.26,4.95-1.11,1.93.12,3.28.87,3.98,1.23,0,0,2.3,1.26,3.87,3.77.61.97.67,1.44.64,1.8-.06.84-.63,1.08-.64,2.01-.01.7.29.79.29,1.49,0,.95-.57,1.66-.74,1.88-1.12,1.4-3,1.37-3.24,1.36-.06.5-.12.99-.18,1.49"/>
      <path class="cls-2" d="M13.54,8.81c-.12-.28-.43-1.11-.19-2.15.25-1.08.93-1.71,1.16-1.9"/>
      <path class="cls-2" d="M16.68,8.53c.21-.02.63-.1,1.05-.41.66-.5.78-1.24.8-1.4"/>
      <path class="cls-2" d="M17.23,15.3c-.03-.16-.27-1.58-1.57-2.26-1.08-.57-2.45-.4-3.44.44"/>
      <path class="cls-2" d="M15.22,9.72c.2.14.61.47.83,1.05.43,1.15-.32,2.19-.39,2.28"/>
      <path class="cls-2" d="M12.39,10.54c-.22,0-.83-.01-1.43-.41-.53-.35-.78-.81-.88-1.02"/>
      <path class="cls-2" d="M11.18,7.87c-.15.26-.44.7-.96,1.05-.91.61-1.86.53-2.15.5"/>
      <path class="cls-2" d="M19.57,10.68c-.59.2-1.17.4-1.76.61"/>
      <circle class="cls-1" cx="8.31" cy="14.84" r="2.31"/>
      <line class="cls-2" x1="8.88" y1="14.31" x2="7.74" y2="15.45"/>
      <line class="cls-2" x1="7.74" y1="14.31" x2="8.88" y2="15.45"/>
    </svg>` },
    { id: "stethoscope", name: "Stethoscope", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M5.91,2.08s-2.79-.71-2.97,1.82c-.19,2.53.67,9.87,5.61,9.87s5.8-7.34,5.61-9.87c-.19-2.53-2.97-1.82-2.97-1.82"/>
      <path class="cls-1" d="M8.55,13.77s-.72,5.58,2.79,7.6,6.35-.82,6.87-3.27.71-3.27.71-3.27"/>
      <path class="cls-1" d="M21.08,13.13c0,.96-.78,1.75-1.75,1.75s-1.75-.78-1.75-1.75.78-1.75,1.75-1.75,1.75.78,1.75,1.75Z"/>
    </svg>` },
    { id: "dna", name: "DNA", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1, .cls-2 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
    
          .cls-2 {
            stroke-width: .91px;
          }
        </style>
      </defs>
      <path class="cls-1" d="M8.23,22.06c0-5.01,8.01-5.01,8.01-10.03S8.23,7.01,8.23,2"/>
      <path class="cls-1" d="M15.71,2c0,5.01-8.01,5.01-8.01,10.03s8.01,5.01,8.01,10.03"/>
      <line class="cls-2" x1="8.23" y1="13.68" x2="15.75" y2="13.68"/>
      <line class="cls-2" x1="8.45" y1="21" x2="15.49" y2="21"/>
      <line class="cls-2" x1="8.45" y1="10.17" x2="15.49" y2="10.17"/>
      <line class="cls-2" x1="8.45" y1="3" x2="15.49" y2="3"/>
    </svg>` },
    { id: "target", name: "Target", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M20.99,7.61c1.82,3.73,1.18,8.37-1.92,11.46-3.9,3.9-10.24,3.9-14.14,0s-3.9-10.24,0-14.14c3.1-3.1,7.73-3.74,11.46-1.92"/>
      <path class="cls-1" d="M17.79,10.55c.49,1.97-.02,4.14-1.56,5.68-2.33,2.33-6.12,2.33-8.46,0s-2.33-6.12,0-8.46c1.54-1.54,3.71-2.06,5.68-1.56"/>
      <path class="cls-1" d="M13.76,12.87c-.09.19-.21.37-.37.52-.77.77-2.02.77-2.79,0s-.77-2.02,0-2.79c.16-.16.33-.28.52-.37"/>
      <polygon class="cls-1" points="17.97 8.22 16.17 7.83 15.78 6.03 17.97 3.83 18.36 5.64 20.17 6.03 17.97 8.22"/>
      <line class="cls-1" x1="12" y1="12" x2="16.17" y2="7.83"/>
    </svg>` },
    { id: "syringe", name: "Syringe", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M18.65,17.63l-1.22,1.22c-.4.4-1.06.4-1.47,0L6.89,9.77l2.68-2.68,9.08,9.08c.4.41.4,1.06,0,1.47Z"/>
      <path class="cls-1" d="M18.73,17.54l.28.28c.36.36.36.94,0,1.3h0c-.36.36-.94.36-1.3,0l-.28-.28"/>
      <line class="cls-1" x1="21.62" y1="21.73" x2="19.01" y2="19.12"/>
      <rect class="cls-1" x="3.99" y="6.72" width="7.25" height="1.93" transform="translate(-3.2 7.63) rotate(-45)"/>
      <polyline class="cls-1" points="6.26 7.67 2.92 4.33 4.13 3.12 7.47 6.46"/>
      <line class="cls-1" x1="2.1" y1="5.14" x2="4.98" y2="2.27"/>
      <line class="cls-1" x1="11.06" y1="8.57" x2="9.97" y2="9.66"/>
      <line class="cls-1" x1="12.22" y1="9.72" x2="10.65" y2="11.28"/>
      <line class="cls-1" x1="13.21" y1="10.72" x2="12.47" y2="11.46"/>
      <line class="cls-1" x1="14.21" y1="11.72" x2="12.9" y2="13.03"/>
      <line class="cls-1" x1="15.48" y1="12.99" x2="14.74" y2="13.73"/>
      <line class="cls-1" x1="16.53" y1="14.04" x2="15.32" y2="15.24"/>
      <line class="cls-1" x1="17.58" y1="15.09" x2="16.9" y2="15.77"/>
    </svg>` },
    { id: "scales", name: "Scales", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            stroke-width: 2;
                stroke-linecap: round;
          }
    
          .cls-1, .cls-2 {
            fill: #fff;
            stroke: #000;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-2" d="M20.87,6.41v13.46c0,1.18-.96,2.13-2.13,2.13H5.27c-1.18,0-2.13-.96-2.13-2.13V6.41c0-1.18.96-2.13,2.13-2.13h2.07c-.82,1.03-1.32,2.34-1.32,3.76,0,.82.16,1.59.46,2.3.17.41.57.67,1.01.67h9.13c.44,0,.84-.26,1.01-.67.29-.71.46-1.49.46-2.3,0-1.42-.49-2.73-1.32-3.76h1.95c1.18,0,2.13.96,2.13,2.13Z"/>
      <path class="cls-2" d="M18.09,8.03c0,.71-.12,1.38-.34,2.01-.2.58-.75.96-1.36.96H7.73c-.61,0-1.15-.39-1.36-.96-.22-.63-.34-1.31-.34-2.01,0-1.42.49-2.73,1.32-3.76,1.11-1.38,2.81-2.27,4.72-2.27s3.61.89,4.72,2.27c.82,1.03,1.32,2.34,1.32,3.76Z"/>
      <line class="cls-1" x1="12.06" y1="11.01" x2="14.24" y2="6.19"/>
    </svg>` },
    { id: "social-stigma", name: "Social stigma", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M16.97,7.69c.11,0,.2.09.2.2s-.09.2-.2.2-.2-.09-.2-.2.09-.2.2-.2M14.54,7.69c.11,0,.2.09.2.2s-.09.2-.2.2-.2-.09-.2-.2.09-.2.2-.2M13.73,11.94v-1.12c-1.07-.86-1.49-2.3-1.03-3.6.46-1.3,1.68-2.17,3.06-2.17s2.6.87,3.06,2.17c.46,1.3.04,2.74-1.03,3.6v1.12M15.76,10.73v1.22M5.63,13.97c-1.34,0-2.43,1.09-2.43,2.43v1.62h1.22l.41,4.05h1.62l.41-4.05h1.22v-1.62c0-1.34-1.09-2.43-2.43-2.43ZM3.81,11.34c0,1.01.82,1.82,1.82,1.82s1.82-.82,1.82-1.82-.82-1.82-1.82-1.82-1.82.82-1.82,1.82M9.68,12.75c0,.45.36.81.81.81h1.62v2.84l2.84-2.84h6.08c.45,0,.81-.36.81-.81V4.25c0-.45-.36-.81-.81-.81h-10.53c-.45,0-.81.36-.81.81v8.51Z"/>
    </svg>` },
      { id: "patient-eligibility", name: "Patient eligibility", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M6.36,16.81h3.58M4.89,19.32h5.05M4.92,9.48c0,2.66,2.15,4.81,4.81,4.81s4.81-2.16,4.81-4.81c0-2.66-2.15-4.81-4.81-4.81s-4.81,2.16-4.81,4.81M12.48,13.43c-.32-1.26-1.45-2.14-2.75-2.14s-2.43.88-2.75,2.14M8.2,8.56c0,.85.69,1.53,1.53,1.53s1.53-.69,1.53-1.53c0-.85-.69-1.53-1.53-1.53s-1.53.69-1.53,1.53M18.22,13.28l1.18,3.11h2.29c.24,0,.45.13.54.35s.03.47-.15.63l-1.99,1.39,1.1,2.53c.1.24.04.51-.16.68-.19.17-.47.2-.7.07l-2.66-1.5-2.67,1.5c-.22.13-.5.1-.7-.07-.19-.17-.26-.44-.16-.68l1.1-2.53-1.99-1.39c-.18-.16-.24-.41-.15-.63.09-.22.3-.36.54-.35h2.29l1.18-3.11c.1-.2.31-.33.54-.33s.44.13.54.33ZM11.56,22.2H2.84c-.51,0-.92-.41-.92-.92V2.92c0-.51.41-.92.92-.92h13.77c.51,0,.92.41.92.92v7.34"/>
    </svg>` },
      { id: "multidisciplinary-team", name: "Multidisciplinary team", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M21.95,21.91c-.45-1.78-2.06-3.03-3.9-3.03s-3.44,1.25-3.9,3.03h7.79ZM16.11,16.07c0,1.08.87,1.95,1.95,1.95s1.95-.87,1.95-1.95-.87-1.95-1.95-1.95-1.95.87-1.95,1.95ZM9.84,21.91c-.45-1.78-2.06-3.03-3.9-3.03s-3.44,1.25-3.9,3.03h7.79ZM3.99,16.07c0,1.08.87,1.95,1.95,1.95s1.95-.87,1.95-1.95-.87-1.95-1.95-1.95-1.95.87-1.95,1.95ZM15.9,9.79c-.45-1.78-2.06-3.03-3.9-3.03s-3.44,1.25-3.9,3.03h7.79ZM10.05,3.95c0,1.08.87,1.95,1.95,1.95s1.95-.87,1.95-1.95-.87-1.95-1.95-1.95-1.95.87-1.95,1.95ZM12,13.69l-1.95,1.95M12,13.69l1.95,1.95M12,11.52v2.16"/>
    </svg>` },
    { id: "bariatric-surgery-", name: "Bariatric surgery ", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            stroke-miterlimit: 10;
          }
    
          .cls-1, .cls-2 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
          }
    
          .cls-2 {
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M13.17,1.98c0,.4.07,1.05.4,1.77.25.56.58.96.82,1.22.54-.09,1.49-.16,2.58.19.42.14,1.83.65,2.79,2.07.38.57.54,1.05.73,1.67.6,1.92.48,3.58.42,4.15-.08.79-.34,2.34-1.29,4.01-.22.39-.7,1.17-1.5,2-.68.71-1.41,1.48-2.63,1.99-1.5.62-3.17.62-4.15.23-.73-.3-1.17-.54-1.17-.54-.51-.28-.62-.42-1.01-.54-.19-.06-.61-.18-1.13-.09-.27.05-.66.12-.92.44-.47.56-.14,1.42-.12,1.46"/>
      <path class="cls-1" d="M5.3,21.97c-.07-.38-.12-.92-.05-1.57.06-.53.09-.85.31-1.2.41-.65,1.17-.94,1.31-.99.24-.09.47-.13.8-.33.11-.06.31-.19.51-.38.08-.08.32-.33.63-1.17.1-.27.23-.65.33-1.11"/>
      <path class="cls-1" d="M9.93,9.57c.11-.67.17-1.03.37-1.48.25-.57.58-.95.8-1.2.25-.29.64-.66,1.18-1.01"/>
      <path class="cls-1" d="M10.83,2.37c-.1.37-.18.84-.17,1.38,0,1.27.47,2.24.77,2.75"/>
      <path class="cls-2" d="M3.42,9.81h.02s6.16,1.64,6.16,1.64c.14.04.25.13.32.25.04.07.1.14.18.15,1.76.39,3.54.77,5.31,1.17.27.06.72.2,1.18.53.34.24.57.51.72.71-.14.15-.39.4-.75.59-1.07.59-2.24.31-3.12.09-.84-.2-1.26-.31-1.57-.68-.21-.26-.33-.58-.77-.91-.25-.19-.47-.29-.56-.32-.3-.11-.65-.35-.78-.15-.11.16-.3.25-.5.21l-6.3-.95c-.21-.02-.38-.2-.39-.42-.02-.29,0-.58.06-.87s.16-.56.29-.82c.1-.17.31-.27.51-.23Z"/>
      <line class="cls-2" x1="9.25" y1="13.09" x2="9.59" y2="11.45"/>
    </svg>` },
    { id: "clinical-trials-guidelines", name: "Clinical trials guidelines", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M12.88,8.02h-2.98v2.53h-2.53v2.98h2.53v2.53h2.98v-2.53h2.53v-2.98h-2.53v-2.53ZM18.21,12.04h3.79M18.21,7.58h3.79M18.21,16.28h2.46c.36,0,.7-.14.95-.39.25-.25.39-.59.39-.95V4.68c0-.36-.14-.7-.39-.95-.25-.25-.59-.39-.95-.39h-2.46v12.95ZM16.87,2H4.59c-.74,0-1.34.6-1.34,1.34v17.41c0,.74.6,1.34,1.34,1.34h12.28c.74,0,1.34-.6,1.34-1.34V3.34c0-.74-.6-1.34-1.34-1.34ZM1.91,6.69h2.68M1.91,17.4h2.68M1.91,12.04h2.68"/>
    </svg>` },
      { id: "lifestyle", name: "Lifestyle", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #484848;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M14.28,5.83c1.72-.24,3.07-1.59,3.32-3.32.02-.14-.03-.28-.13-.38-.1-.1-.24-.15-.38-.13-1.72.24-3.07,1.6-3.32,3.32-.02.14.03.28.13.38s.24.15.38.13ZM12,8.06v-1.73c0-.96-.78-1.73-1.73-1.73h-1.73M12,21.06c1.3,0,.43.87,3.03.87s5.2-5.2,5.2-8.66-2.17-6.06-4.76-6.06-2.6.87-3.47.87-.87-.87-3.47-.87-4.76,2.6-4.76,6.06,2.6,8.66,5.2,8.66,1.73-.87,3.03-.87Z"/>
    </svg>` },
      { id: "psychological-burden-", name: "Psychological  burden ", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M5.48,22v-5.57c-1.23-1.14-2.09-2.62-2.46-4.26-.37-1.63-.25-3.34.37-4.9.61-1.56,1.68-2.9,3.07-3.84,1.39-.94,3.02-1.45,4.7-1.44,6.35,0,7.72,5.23,9.99,11.11.04.1.05.21.04.32-.01.11-.05.21-.11.3-.06.09-.14.16-.24.21-.1.05-.2.08-.31.08h-1.69v2.67c0,.71-.28,1.39-.78,1.89s-1.18.78-1.89.78h-1.33v2.67"/>
      <polygon class="cls-1" points="11.38 3.7 5.68 13.57 17.08 13.57 11.38 3.7"/>
      <line class="cls-1" x1="11.38" y1="7.59" x2="11.38" y2="9.99"/>
      <line class="cls-1" x1="11.38" y1="11.38" x2="11.38" y2="11.38"/>
    </svg>` },
    { id: "adverse-events", name: "Adverse events", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <polygon class="cls-1" points="5.71 10.49 9.8 10.49 9.8 13.97 13.28 13.97 13.28 18.06 9.8 18.06 9.8 21.54 5.71 21.54 5.71 18.06 2.23 18.06 2.23 13.97 5.71 13.97 5.71 10.49"/>
      <polyline class="cls-1" points="15.08 5.77 15.08 8.44 17.24 8.44"/>
      <path class="cls-1" d="M9.16,7.15c.51-2.78,2.94-4.88,5.87-4.88,3.3,0,5.97,2.67,5.97,5.97,0,2.66-1.74,4.91-4.14,5.68"/>
    </svg>` },
    { id: "psychological-burden-copy", name: "Psychological  burden  copy", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 48">
      <defs>
        <style>
          .cls-1 {
            mask: url(#mask);
          }
    
          .cls-2 {
            fill: #ccc;
          }
    
          .cls-3 {
            fill: none;
          }
    
          .cls-3, .cls-4 {
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
    
          .cls-5 {
            fill: #fff;
          }
    
          .cls-6 {
            fill: #484848;
            font-family: Roboto-Regular, Roboto;
            font-size: .33px;
          }
    
          .cls-4 {
            fill: #999;
          }
        </style>
        <mask id="mask" x="2" y="20.22" width="20" height="26.28" maskUnits="userSpaceOnUse">
          <path class="cls-5" d="M22,36c0,5.52-4.48,10-10,10S2,41.52,2,36c0-11.45,4.48-15.78,10-15.78s10,3.42,10,15.78Z"/>
        </mask>
      </defs>
      <circle class="cls-2" cx="12" cy="36" r="10"/>
      <text class="cls-6" transform="translate(7.59 6.77)"><tspan x="0" y="0">ettpi</tspan></text>
      <g class="cls-1">
        <path class="cls-4" d="M6.27,46v-9.3c-1.08-1-1.83-2.31-2.16-3.74-.33-1.44-.22-2.94.32-4.31.54-1.37,1.48-2.55,2.7-3.38,1.22-.83,2.66-1.27,4.13-1.27,5.59,0,6.79,4.6,8.78,9.76.03.09.05.18.03.28-.01.09-.05.19-.1.26-.05.08-.13.14-.21.19-.08.04-.18.07-.27.07h-1.49v2.35c0,.62-.25,1.22-.69,1.66s-1.04.69-1.66.69h-1.17v6.74"/>
      </g>
      <polygon class="cls-3" points="11.46 25.51 6.45 34.19 16.47 34.19 11.46 25.51"/>
      <line class="cls-3" x1="11.46" y1="28.93" x2="11.46" y2="31.04"/>
      <line class="cls-3" x1="11.46" y1="32.27" x2="11.46" y2="32.27"/>
    </svg>` },
    { id: "clinical-outcomes", name: "Clinical outcomes", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M19.58,19.6l2.4,2.4M15.9,21.13c2.88,0,5.21-2.33,5.21-5.21s-2.33-5.21-5.21-5.21-5.21,2.33-5.21,5.21,2.33,5.21,5.21,5.21ZM8.17,15.93h-1.86v-4.42H1.89v-5.21h4.42V1.87h5.21v4.42h4.42v1.88"/>
    </svg>` },
      { id: "urgency-to-treat", name: "Urgency to treat", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M15.93,2.97c.61-.56,1.42-.93,2.32-.96,2.02-.08,3.73,1.49,3.81,3.51.04.9-.26,1.73-.77,2.39"/>
      <path class="cls-1" d="M8.07,2.97c-.61-.56-1.42-.93-2.32-.96-2.02-.08-3.73,1.49-3.81,3.51-.04.9.26,1.73.77,2.39"/>
      <line class="cls-1" x1="6.44" y1="18.99" x2="4.71" y2="21"/>
      <g>
        <circle class="cls-1" cx="12" cy="12.3" r="8.7"/>
        <line class="cls-1" x1="5.72" y1="12.3" x2="6.4" y2="12.3"/>
        <line class="cls-1" x1="12" y1="18.58" x2="12" y2="17.91"/>
        <line class="cls-1" x1="18.28" y1="12.3" x2="17.6" y2="12.3"/>
        <line class="cls-1" x1="12" y1="6.03" x2="12" y2="6.7"/>
        <polyline class="cls-1" points="12 9.2 12 12.3 14.81 15.11"/>
      </g>
      <line class="cls-1" x1="17.56" y1="18.99" x2="19.29" y2="21"/>
    </svg>` },
    { id: "heart", name: "Heart", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #231f20;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M5.03,16.31s-2.98-5.34,1-8.09c3.22-2.23,4.27,1.53,1.96,3.41-2.31,1.87-3.04,2.55-2.96,4.68Z"/>
      <path class="cls-1" d="M9.18,9.74c3.01-.23,5.03,2.34,6.42,3,1.39.66,2.08.72,2.08,3.08s-2.3,8.21-7.05,5.89-5.59-5.4-5.59-5.4"/>
      <path class="cls-1" d="M16.87,13.39s1.31-3.77-2.03-5.5"/>
      <path class="cls-1" d="M11.69,19.79s2.76-3.74,1.98-8.4c-.62-3.72,2.22-4,3.39-3.96.33.01.63-.23.69-.56.04-.24.05-.53-.05-.8-.12-.31-.45-.49-.78-.43-.83.17-2.74.56-4.1.89-1.79.43-3.15,1.92-3.61,3.1"/>
      <path class="cls-1" d="M14.4,6.16s-.43-1.33-.07-2.31c.14-.37-.03-.78-.39-.93l-.06-.02c-.39-.16-.82.05-.95.44-.19.54-.49,1.19-.89,1.19-.46,0-.46-.92-.31-1.66.09-.44-.26-.84-.71-.84h-.05c-.38,0-.68.29-.72.67-.05.6-.27,1.51-1.06,2.33-1.31,1.38-1.78,2.12-1.82,2.55"/>
      <path class="cls-1" d="M9.2,5.04s-.88-3.13-1.07-3.35c0,0-1.28-.31-1.71.59,0,0,.51,4.31-.96,6.41"/>
      <path class="cls-1" d="M13.71,14.49s1.93.46,1.74,3.09"/>
      <path class="cls-1" d="M12.84,17.65s-.41,1.2.49,2.13"/>
      <path class="cls-1" d="M13.61,15.13s-1.89-.07-2.16,2.08"/>
      <path class="cls-1" d="M7.83,11.77s-.65,3.12,1.08,4.69"/>
      <path class="cls-1" d="M7.71,13.13s1.73-.53,2.42.72"/>
      <path class="cls-1" d="M7.75,14.51s-.98.69-.9,1.67"/>
    </svg>` },
      { id: "liver", name: "Liver", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #231f20;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M13.39,9.15c.19-1.37,1.34-2.41,2.73-2.5,1.65-.11,4.87-.2,5.56.63.94,1.12-.94,2.2-1.79,3.39-.85,1.19-2.39,3.02-5.56,3.61-1.21.23-1.1-.59-1.03-2.65.03-.87,0-1.72.1-2.47Z"/>
      <path class="cls-1" d="M15.69,6.71s-5.95-2.23-10.97,0c-1.92.85-3.02,2.66-2.47,7.13.34,2.79-.41,5.15.8,5.19s3.82-3.04,6.27-3.34c2.45-.3,3.39-.36,3.94-3.18"/>
      <path class="cls-1" d="M9.52,15.67c0,.59-.14,1.17-.61,1.58-1.13,1.01-2.25.52-2.91.04"/>
    </svg>` },
      { id: "diabetes", name: "Diabetes", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M12.11,12.92c.02-.12.07-.23.15-.33.14-.18.34-.29.5-.45.33-.34.38-.85.65-1.23.25-.35.66-.56,1.09-.7.98-.31,2.05-.26,3.08-.39.54-.07,1.11-.2,1.5-.56.2-.18.34-.4.53-.59.38-.37.92-.57,1.32-.92.75-.64.92-1.69.98-2.65.02-.37.04-.75-.09-1.1s-.44-.66-.83-.69c-.32-.03-.63.14-.87.34-.24.2-.44.45-.69.64-.47.36-1.12.49-1.71.35-.36-.08-.7-.27-1.06-.27-.63,0-1.2.41-1.81.26-.69-.18-1.45-.35-2.09-.06-.44.2-.77.59-1.23.75-.52.18-1.12.03-1.64.19-.78.24-1.16,1.07-1.8,1.55-.08.06-.17.12-.26.17-.03.02-.05.03-.08.04"/>
      <path class="cls-1" d="M19.87,5.72c-.35.52-1.23.7-1.86.71s-1.24-.16-1.86-.24c-.62-.08-1.29-.06-1.82.27-.53.34-.84.95-1.35,1.32-.52.38-1.2.48-1.81.69-.38.13-.74.31-1.07.53-.51.34-.99.87-.94,1.49.02.23.12.45.22.67.15.33.22.68.21,1.04,0,.35-.17.68-.36.97-.19.29-.41.57-.55.89-.05.11-.08.23-.1.35"/>
      <path class="cls-1" d="M9.16,10.49c.35.08.82.16,1.18.24.1.02.19.04.29.04.29,0,.54-.19.82-.26"/>
      <path class="cls-1" d="M7.72,10.48c-.14-.21-.28-.42-.42-.64-.05-.07-.09-.14-.16-.19-.07-.05-.15-.09-.22-.12-.22-.08-.44-.18-.66-.25"/>
      <path class="cls-1" d="M14.01,10.42c.03-.21,0-.38,0-.59,0-.05,0-.1-.02-.14-.02-.05-.06-.09-.1-.12-.11-.1-.22-.2-.34-.3"/>
      <path class="cls-1" d="M13.66,7.08c.57.22,1.21.44,1.82.38.17-.02.34-.05.52-.07"/>
      <path class="cls-1" d="M17.96,9.77c.16-.39.43-.94.58-1.33"/>
      <path class="cls-1" d="M15.52,8.47c0-.17-.01-.34-.07-.49-.03-.1-.08-.4-.08-.5"/>
      <path class="cls-1" d="M10.54,8.74c.05-.42.01-.88-.17-1.26"/>
      <path class="cls-1" d="M11.57,5.34c.14.26.28.72.27,1.01"/>
      <path class="cls-1" d="M7.22,3.33c-1.1,3.05-1.22,7.32-.58,9.78.3,1.17.71,2.06,1.24,2.73.52.66,1.22,1.09,1.85,1.16.53.06,1.13-.15,1.51-.53.27-.27.53-.68.81-1.12.55-.87,1.23-1.96,2.45-2.64,1.98-1.12,4.64-.6,6.05,1.2.86,1.1,1.11,2.39,1.23,3.5.09.78.13,2.73.13,3.71"/>
      <path class="cls-1" d="M17.82,21.1c0-.84-.03-2.63-.1-3.26-.03-.3-.12-1.09-.38-1.42-.16-.2-.59-.29-.81-.16-.32.18-.65.71-1,1.26-.37.59-.79,1.26-1.4,1.85-1.11,1.1-2.65,1.72-4.21,1.72-.2,0-.41-.01-.61-.03-1.73-.18-3.42-1.16-4.63-2.69-.9-1.13-1.55-2.52-2-4.25-.7-2.68-.9-7.03.13-10.81"/>
      <path class="cls-1" d="M9.23,13.17c.19.16.54.31.7.49.16.17.22.41.29.63.07.22.17.45.37.58"/>
    </svg>` },
    { id: "eye-complications", name: "Eye complications", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #333;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M14.79,11.64c5.51,1.02,7.52,5.09,7.52,5.09,0,0-4.57,5.33-10.43,5.33-4.59,0-8.39-2.66-9.81-3.81-.37-.3-.45-.78-.2-1.17,1.07-1.59,4.29-5.55,10.01-5.67.19,0,.38,0,.56.01"/>
      <path class="cls-1" d="M14.29,12.2c.27.17.53.38.77.62,1.72,1.75,1.67,4.58-.12,6.32-1.78,1.74-4.61,1.73-6.33-.01-1.72-1.75-1.67-4.58.11-6.32,1.02-.99,2.38-1.42,3.68-1.27"/>
      <path class="cls-1" d="M13.39,15.98c0,.97-.71,1.75-1.59,1.75s-1.59-.78-1.59-1.75.71-1.75,1.59-1.75,1.59.78,1.59,1.75Z"/>
      <path class="cls-1" d="M9.18,8.38L15.71,1.98c.23-.22.62.04.48.33l-2.08,4.37c-.07.15,0,.33.18.39l3.12,1.07c.2.07.27.31.13.46l-5.7,6.31c-.21.23-.6,0-.5-.29l1.57-4.57c.05-.14-.03-.31-.18-.36l-3.55-1.32"/>
    </svg>` },
    { id: "eye-complications", name: "Eye complications", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1 {
            fill: none;
            stroke-width: 2;
                stroke: #333;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
        </style>
      </defs>
      <path class="cls-1" d="M16.18,11.6c4.78,1.34,6.55,4.93,6.55,4.93,0,0-4.67,5.44-10.65,5.44-4.69,0-8.57-2.72-10.02-3.89-.38-.31-.46-.8-.2-1.19,1.09-1.62,4.38-5.67,10.22-5.79.45-.01.88,0,1.29.03"/>
      <path class="cls-1" d="M15.33,12.54c1.76,1.79,1.71,4.68-.12,6.45-1.82,1.78-4.71,1.77-6.46-.01-1.76-1.79-1.71-4.68.11-6.45,1.22-1.18,2.91-1.57,4.43-1.16"/>
      <path class="cls-1" d="M13.33,14.75c.19.29.29.64.29,1.01,0,.99-.72,1.79-1.62,1.79s-1.62-.8-1.62-1.79.72-1.79,1.62-1.79c.13,0,.25.02.37.05"/>
      <path class="cls-1" d="M9.65,9.15l6.67-6.53c.23-.23.63.04.49.33l-2.13,4.46c-.07.16,0,.34.18.4l3.19,1.1c.2.07.27.31.13.47l-5.82,6.44c-.21.24-.62,0-.51-.29l1.61-4.67c.05-.15-.03-.31-.18-.37l-3.62-1.34"/>
    </svg>` },
    { id: "renal", name: "Renal", category: "Custom", svg: `<svg id="Guides" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
      <defs>
        <style>
          .cls-1, .cls-2 {
            fill: none;
          }
    
          .cls-2 {
            stroke-width: 2;
                stroke: #000;
            stroke-linecap: round;
            stroke-miterlimit: 10;
          }
    
          .cls-3 {
            clip-path: url(#clippath-1);
          }
    
          .cls-4 {
            clip-path: url(#clippath);
          }
        </style>
        <clipPath id="clippath">
          <rect class="cls-1" x="1.42" y="3.79" width="9.81" height="18.57"/>
        </clipPath>
        <clipPath id="clippath-1">
          <rect class="cls-1" x="12.74" y="3.79" width="9.81" height="18.57"/>
        </clipPath>
      </defs>
      <g id="_Mirror_Repeat_" data-name="&amp;lt;Mirror Repeat&amp;gt;">
        <g class="cls-4">
          <path class="cls-2" d="M10.72,21.87v-9.52c-.02-.4-.11-1.1-.53-1.83-.22-.37-.69-1.19-1.68-1.54-.85-.3-1.6-.08-1.88,0-.3.09-1,.31-1.54,1.01-.6.77-.59,1.62-.58,1.88"/>
          <path class="cls-2" d="M8.74,11.84c.09.18.22.52.21.96-.03.83-.59,1.35-.71,1.45-.59.54-1.29.59-1.79.62-.28.02-1.35.08-2.41-.58-1.33-.83-1.73-2.2-1.91-2.83-.29-1.02-.22-1.86-.17-2.54.06-.66.12-1.38.54-2.2.4-.8.92-1.27,1.04-1.37.25-.22.86-.75,1.83-.96.36-.08,1.08-.22,1.91.08.37.14,1.09.4,1.45,1.16.38.8.11,1.58.04,1.75"/>
          <path class="cls-2" d="M6.79,6.72c-.09.14-.22.38-.25.71-.07.69.36,1.19.44,1.29"/>
          <path class="cls-2" d="M3.65,8.35c.12-.04.46-.16.83-.02.46.17.78.68.78,1.26"/>
          <path class="cls-2" d="M6.78,12.22c-.06-.17-.17-.56-.06-1.03.13-.52.46-.82.59-.94.83-.76,2.02-.55,2.2-.52"/>
        </g>
      </g>
      <g id="_Mirror_Repeat_-2" data-name="&amp;lt;Mirror Repeat&amp;gt;">
        <g class="cls-3">
          <path class="cls-2" d="M13.24,21.87v-9.52c.02-.4.11-1.1.53-1.83.22-.37.69-1.19,1.68-1.54.85-.3,1.6-.08,1.88,0,.3.09,1,.31,1.54,1.01.6.77.59,1.62.58,1.88"/>
          <path class="cls-2" d="M15.22,11.84c-.09.18-.22.52-.21.96.03.83.59,1.35.71,1.45.59.54,1.29.59,1.79.62.28.02,1.35.08,2.41-.58,1.33-.83,1.73-2.2,1.91-2.83.29-1.02.22-1.86.17-2.54-.06-.66-.12-1.38-.54-2.2-.4-.8-.92-1.27-1.04-1.37-.25-.22-.86-.75-1.83-.96-.36-.08-1.08-.22-1.91.08-.37.14-1.09.4-1.45,1.16-.38.8-.11,1.58-.04,1.75"/>
          <path class="cls-2" d="M17.17,6.72c.09.14.22.38.25.71.07.69-.36,1.19-.44,1.29"/>
          <path class="cls-2" d="M20.32,8.35c-.12-.04-.46-.16-.83-.02-.46.17-.78.68-.78,1.26"/>
          <path class="cls-2" d="M17.18,12.22c.06-.17.17-.56.06-1.03-.13-.52-.46-.82-.59-.94-.83-.76-2.02-.55-2.2-.52"/>
        </g>
      </g>
    </svg>` }

];

// ---- API SERVICE ----

/**
 * Fetch icons from your backend API.
 * Falls back to SAMPLE_ICONS if the request fails (useful during dev).
 */
async function fetchIconsFromAPI(accessToken) {
  try {
    const res = await fetch(`${ICON_API_BASE}/icons`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json(); // expects same shape as SAMPLE_ICONS
  } catch (err) {
    console.warn("[Icons] API fetch failed, using sample data:", err.message);
    return SAMPLE_ICONS;
  }
}

/**
 * Get unique categories from an icon list.
 */
function getCategories(icons) {
  const cats = [...new Set(icons.map(i => i.category))].sort();
  return ["All", ...cats];
}

/**
 * Filter icons by category and/or search query.
 */
function filterIcons(icons, { category = "All", query = "" } = {}) {
  const q = query.toLowerCase().trim();
  return icons.filter(icon => {
    const inCat = category === "All" || icon.category === category;
    const inQuery = !q || icon.name.toLowerCase().includes(q) || icon.category.toLowerCase().includes(q) || icon.id.includes(q);
    return inCat && inQuery;
  });
}

// Expose to window for cross-file access
window.fetchIconsFromAPI = fetchIconsFromAPI;
window.getCategories = getCategories;
window.filterIcons = filterIcons;
