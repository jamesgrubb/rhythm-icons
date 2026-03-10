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
