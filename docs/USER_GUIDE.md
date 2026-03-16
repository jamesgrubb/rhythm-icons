# Rhythm Icons - User Guide

## Welcome to Rhythm Icons!

Rhythm Icons is a Microsoft Office Add-in that gives you instant access to a library of professional medical and scientific icons. Insert beautiful, customizable icons directly into your Word documents and PowerPoint presentations.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Finding Icons](#finding-icons)
3. [Inserting Icons](#inserting-icons)
4. [Customizing Icons](#customizing-icons)
5. [Uploading Custom Icons](#uploading-custom-icons)
6. [Tips & Tricks](#tips--tricks)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Launching the Add-in

#### In Microsoft Word

1. Open a Word document
2. Click the **Insert** tab in the ribbon
3. Look for the **Rhythm Icons** button (or **Insert Icon**)
4. Click the button to open the taskpane

**Alternative:**
- Go to **Insert → Add-ins → My Add-ins**
- Find **Rhythm Icons Library** and click to launch

#### In Microsoft PowerPoint

1. Open a PowerPoint presentation
2. Click the **Insert** tab in the ribbon
3. Look for the **Rhythm Icons** button (or **Insert Icon**)
4. Click the button to open the taskpane

**Alternative:**
- Go to **Insert → Add-ins → My Add-ins**
- Find **Rhythm Icons Library** and click to launch

### First-Time Sign-In

When you first launch Rhythm Icons, you'll need to sign in:

1. Click **Sign in with Microsoft**
2. A popup window will appear asking you to authenticate
3. Sign in with your **organizational Microsoft 365 account**
   - ⚠️ Personal Microsoft accounts (Hotmail, Outlook.com, etc.) are **not supported**
4. You may see a consent prompt asking for permission to:
   - Read your profile
   - Access icons on your behalf
5. Click **Accept** to grant permissions
6. You're now signed in! The icon library will load automatically

**Note:** You only need to sign in once. The add-in will remember you for future sessions.

---

## Finding Icons

### Browse by Category

Icons are organized into categories:

- **All** - View all available icons
- **Custom** - Icons specific to your organization (if you've uploaded any)
- **[Other categories]** - Additional categories as they become available

Click on a category tab at the top of the taskpane to filter icons.

### Search for Icons

Use the search bar at the top to quickly find icons:

1. Click in the **Search icons** field
2. Type your search query (e.g., "heart", "diabetes", "lungs")
3. Results update automatically as you type
4. Click the ✕ button to clear your search

**Search Tips:**
- Search works across icon names and categories
- Try related terms (e.g., "cardiac" finds "heart" icons)
- Searches are case-insensitive

### Icon Count

The bottom of the taskpane shows how many icons match your current filter:
- "24 icons" - Total icons in the current view

---

## Inserting Icons

### Basic Insertion

To insert an icon into your document:

1. **Position your cursor** where you want the icon to appear
   - In Word: Click in the text where you want the icon
   - In PowerPoint: Select a slide

2. **Find the icon** you want using search or categories

3. **Click the icon** in the grid

4. The icon will be inserted instantly!

### Insertion Behavior

**In Word:**
- Icons are inserted as **inline pictures** at your cursor position
- Icons flow with text (like characters)
- You can resize, move, and format icons like any image

**In PowerPoint:**
- Icons are inserted on the **current slide**
- Icons are placed as **shapes** that you can move and resize
- Icons support PowerPoint theme colors (see Customization section)

### Multiple Insertions

You can insert as many icons as you need:
- Click different icons to insert them one by one
- Each click inserts a new copy
- Icons are independent - customizing one doesn't affect others

---

## Customizing Icons

Before inserting an icon, you can customize its appearance using the controls at the bottom of the taskpane.

### Icon Size

Choose from four sizes:

- **32px** - Small (good for inline text in Word)
- **48px** - Medium (default, balanced size)
- **64px** - Large (recommended for PowerPoint)
- **96px** - Extra Large (presentations, posters)

**How to change size:**
1. Click one of the size buttons (32, 48, 64, 96) at the bottom
2. The selected size is highlighted in blue
3. All future icon insertions will use this size

### Icon Color (PowerPoint Only)

PowerPoint icons support theme colors that adapt to your presentation's design:

**Available Colors:**
- **Accent 1-6** - Your presentation's accent colors
- **Text 1-2** - Your presentation's text colors
- **Background 1-2** - Your presentation's background colors

**How to change color:**
1. Click the color selector at the bottom (shows color swatches)
2. Select a theme color
3. Icons inserted will use this color and adapt if you change your presentation theme

**Note:** Color customization is only available in PowerPoint. Word icons use the default black color.

### Circle Background

Add a subtle circle background to your icons:

1. Toggle the **Circle Background** switch at the bottom
2. When enabled, icons will have a light circular background
3. Great for creating cohesive icon sets or highlighting icons

### Fill vs. Stroke

Some icons support different rendering styles:

1. Toggle the **Fill Mode** switch
2. **OFF** (default): Icons use stroke/outline style
3. **ON**: Icons use filled/solid style

**Note:** Not all icons support fill mode. The toggle only affects compatible icons.

---

## Uploading Custom Icons

### Adding Your Organization's Icons

Rhythm Icons allows you to upload custom SVG icons that will be available only to users in your organization.

#### Step 1: Prepare Your Icons

Before uploading, ensure your SVG files meet these requirements:

✅ **File Format:** SVG (Scalable Vector Graphics)
✅ **ViewBox:** Standard 24x24 viewBox (`viewBox="0 0 24 24"`)
✅ **Stroke Width:** 2px for consistency with the library
✅ **File Naming:** Use descriptive names (e.g., `company-logo.svg`, `custom-diagram.svg`)

**Recommended Tools:**
- Adobe Illustrator
- Inkscape (free)
- Figma (export as SVG)
- Sketch (export as SVG)

#### Step 2: Upload Icons

1. Click the **Upload Icons** button at the bottom of the taskpane
2. A modal dialog will appear
3. Click **Choose Files** (or drag and drop SVG files)
4. Select one or more SVG files from your computer
5. Choose a **Category** for these icons (or type a new category name)
6. Click **Preview** to see how your icons will look

#### Step 3: Review and Add

1. Review the icon previews in the grid
2. If everything looks good, click **Add to Library**
3. The icons will be uploaded and available immediately
4. They appear in the "Custom" category (or your chosen category)

**Important Notes:**
- Custom icons are **tenant-specific** - only users in your organization can see them
- Icons are stored in the database and persist across sessions
- You can upload up to 50 icons at once
- Total custom icon limit: 500 per organization

#### Step 4: Copy Generated Code (Optional)

After uploading, you can copy the generated JavaScript code:

1. Click **Copy Code** in the upload dialog
2. The code is copied to your clipboard
3. You can paste this into `icons.js` to add icons to your local development environment

---

## Tips & Tricks

### Keyboard Shortcuts

- **Ctrl/Cmd + F** - Focus search bar
- **Esc** - Clear search
- **Tab** - Navigate between controls

### Quick Workflow

For fastest icon insertion:

1. **Keep the taskpane open** while working on your document
2. **Use search** to quickly find icons instead of scrolling
3. **Pre-select size and color** before inserting multiple icons
4. **Use categories** to narrow down options

### Word-Specific Tips

- **Inline vs. Floating:** Icons are inserted as inline images by default
  - Right-click → Wrap Text → change to "Square" or "Tight" to make them float
- **Alignment:** Use Word's alignment tools (left, center, right) to position icons
- **Text Wrapping:** Icons flow with text - great for callouts and inline diagrams

### PowerPoint-Specific Tips

- **Theme Colors:** Always use theme colors (not custom colors) so icons adapt when you change themes
- **Grouping:** Select multiple icons and press **Ctrl/Cmd + G** to group them
- **Alignment:** Use PowerPoint's alignment tools (Arrange → Align) to line up icons
- **Animation:** You can animate icons just like any other shape

### Icon Organization

- **Create a slide/page of icons** as a reference library for your team
- **Use consistent sizes** throughout a document for professional look
- **Group related icons** together for visual cohesion

---

## Troubleshooting

### Icon won't insert

**Problem:** Clicking an icon doesn't do anything

**Solutions:**
1. Make sure your document is editable (not in Read Mode or protected)
2. Click on a different part of the document before inserting
3. Try closing and reopening the taskpane
4. Check the browser console (F12) for error messages

### Icons appear blurry

**Problem:** Inserted icons look pixelated or blurry

**Solutions:**
1. Use a larger icon size (64px or 96px for PowerPoint)
2. Ensure you're not stretching the icon after insertion
3. In Word, check the image compression settings (File → Options → Advanced → Image Size and Quality)

### Sign-in failed

**Problem:** Can't sign in or getting "Authentication failed" error

**Solutions:**
1. Make sure you're using your **organizational** Microsoft 365 account
2. Check that you have a valid Word/PowerPoint license
3. Clear your browser cookies and try again
4. Contact your IT administrator if the issue persists

### Icons don't match my PowerPoint theme

**Problem:** Icon colors look wrong after changing presentation theme

**Solutions:**
1. Delete the old icons and re-insert them with the new theme
2. Or, right-click icon → Format Picture → Fill → Theme Colors

### Can't find uploaded custom icons

**Problem:** Icons you uploaded aren't showing up

**Solutions:**
1. Check the "Custom" category tab at the top
2. Make sure you're signed in with the same organization account
3. Try refreshing the taskpane (close and reopen)
4. Contact support if icons are missing after 24 hours

### Add-in is slow or unresponsive

**Problem:** The taskpane is loading slowly or freezing

**Solutions:**
1. Close other browser tabs or applications to free up memory
2. Clear your browser cache
3. Restart Word/PowerPoint
4. Check your internet connection (the add-in requires internet access)

---

## Need More Help?

### Contact Support

- **Email:** support@spectrum-science.com
- **Help Center:** [https://rhythm-icons-production.up.railway.app/support](https://rhythm-icons-production.up.railway.app/support)

### IT Administrator Resources

If you're an IT administrator deploying Rhythm Icons to your organization, see:
- **Deployment Guide:** `/docs/CUSTOMER_DEPLOYMENT.md`
- **Admin Email:** it-support@spectrum-science.com

---

## Appendix: Icon Design Guidelines

If you're creating custom icons for upload, follow these best practices:

### Technical Requirements

```xml
<!-- Standard SVG template -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" d="..." />
</svg>
```

**Key Properties:**
- `viewBox="0 0 24 24"` - Standard coordinate system
- `stroke-width="2"` - Consistent 2px stroke
- `stroke-linecap="round"` - Rounded line ends
- `stroke-linejoin="round"` - Rounded corners
- `fill="none"` - Stroke-only icons (recommended)

### Design Best Practices

1. **Keep it simple** - Icons should be recognizable at small sizes
2. **Use consistent stroke weight** - 2px throughout
3. **Align to pixel grid** - Avoid half-pixels for crispness
4. **Center in viewBox** - Leave some padding around edges
5. **Test at multiple sizes** - Ensure legibility at 32px and 96px

### Naming Conventions

- Use lowercase, kebab-case: `my-custom-icon.svg`
- Be descriptive: `company-logo.svg` not `icon1.svg`
- Avoid special characters except hyphens

---

**© 2026 Spectrum Science Communications, LLC. All rights reserved.**

**Version 1.0 | Last Updated: March 2026**
