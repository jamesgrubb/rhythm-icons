# 🧪 Icon Library Add-in - Testing Instructions

Thank you for helping test the Icon Library add-in! This add-in provides quick access to your organization's curated icon library directly within Microsoft Word and PowerPoint.

## 📥 Step 1: Install the Add-in

### For Microsoft Word/PowerPoint (Desktop)

1. Download the `manifest.xml` file from the link provided
2. Open **Microsoft Word** or **Microsoft PowerPoint**
3. Click the **Insert** tab in the ribbon
4. Click **Add-ins** → **Get Add-ins**
5. In the Office Add-ins dialog, click **My Add-ins** (left sidebar, bottom)
6. Click **Upload My Add-in** (top-right corner)
7. Click **Browse** and select the `manifest.xml` file you downloaded
8. Click **Upload**
9. You should see a confirmation message

### For Microsoft Word/PowerPoint (Web - Office.com)

1. Go to [office.com](https://office.com) and sign in with your Microsoft account
2. Open **Word** or **PowerPoint** (create a new blank document)
3. Click **Insert** → **Add-ins** → **More Add-ins**
4. Click **Upload My Add-in** (bottom of dialog)
5. Click **Browse** and select the `manifest.xml` file
6. Click **Upload**

> **Note:** The add-in works in both Word and PowerPoint!

## 🚀 Step 2: Open the Add-in

1. Look for the **Icon Library** button in the **Home** tab of the ribbon
2. Click **Show Taskpane**
3. A side panel will open on the right side of your screen
4. You should see a loading screen, then a sign-in screen

## 🔐 Step 3: Sign In with Microsoft

1. Click the **"Sign in with Microsoft"** button
2. A popup window will appear asking you to sign in
   - **Important:** Allow popups if your browser blocks them
3. Sign in with your Microsoft account:
   - Work/School account: `you@yourcompany.com`
   - Personal account: `you@outlook.com` or `you@hotmail.com`
4. First-time users will see a **consent screen**:
   - The app is requesting permission to "Read icons from the Icon Library"
   - Click **Accept** to continue
5. The popup will close automatically
6. You should now see a grid of icons!

> **Troubleshooting Sign-in:**
> - If popup is blocked: Allow popups for this site in your browser settings
> - If sign-in fails: Check browser console (press F12) for error messages
> - Try a different browser: Microsoft Edge works best with Microsoft authentication

## 🎨 Step 4: Test Icon Features

Now that you're signed in, please test these features:

### 4.1 Browse Icons
- Scroll through the icon grid
- Notice icons are organized by category
- Try clicking different category tabs at the top

### 4.2 Search Icons
- Use the search box at the top
- Try searching for common terms like "heart", "star", "user"
- Clear search with the X button

### 4.3 Size Adjustment
- Notice the size buttons: **S** (Small), **M** (Medium), **L** (Large)
- Click different sizes to preview
- Icons will be inserted at the selected size

### 4.4 Theme Colors
- Try different theme color buttons: **BG1**, **BG2**, **T1**, **T2**, **A1-A6**
- These use your document's theme colors
- **A1** (Accent 1) is selected by default

### 4.5 Background Options
- Toggle "Circle background" on/off
- Toggle "Fill icon" on/off
- See the preview update in real-time

### 4.6 Insert an Icon
- Click any icon in the grid
- The icon should be inserted at your cursor position (Word) or on the slide (PowerPoint)
- You should see a green toast notification: "Icon inserted"

## ✅ Step 5: Test Session Persistence

Let's verify your session is saved:

1. **Close** the Icon Library taskpane (click X on the panel)
2. **Reopen** it: Home tab → Icon Library → Show Taskpane
3. **Expected result:** You should see your icons immediately without signing in again
4. **If you see sign-in screen:** This means session restoration isn't working - please report this!

## 🚪 Step 6: Test Sign Out

1. Look for the **sign-out button** (top-right corner, looks like an exit/door icon)
2. Click the sign-out button
3. A popup will appear to complete the sign-out
4. **Expected result:** You return to the sign-in screen
5. Try signing in again to make sure it works

## 📝 What to Report Back

Please send me feedback on:

### ✅ What Worked
- "Sign-in was smooth"
- "Icons loaded quickly"
- "Inserted icon looks perfect"
- "Search works great"

### ❌ What Didn't Work
- Sign-in errors (screenshot the error message)
- Icons didn't load (how long did you wait?)
- Icon insertion failed (what happened?)
- Performance issues (slow loading, laggy)
- Visual glitches or layout problems

### 💡 Suggestions
- Missing features you'd like to see
- UI/UX improvements
- Icon requests (categories or specific icons)
- Documentation improvements

## 🐛 How to Report Issues

When reporting an issue, please include:

1. **Browser/Office version:**
   - Example: "Word Desktop 2021 on Windows 11"
   - Example: "PowerPoint Online on Chrome"

2. **Screenshot of the error:**
   - Press Windows Key + Shift + S (Windows) or Cmd + Shift + 4 (Mac)
   - Include the whole screen if possible

3. **Browser console log (if applicable):**
   - Press **F12** to open Developer Tools
   - Click the **Console** tab
   - Screenshot any red error messages
   - Copy/paste error text if possible

4. **Steps to reproduce:**
   - What did you click?
   - What were you trying to do?
   - Does it happen every time?

## 📧 Send Feedback To

**Email:** [YOUR_EMAIL@COMPANY.COM]

**Subject Line:** Icon Library Add-in Feedback - [Your Name]

**Include:**
- Screenshots (if any issues)
- Browser console errors (if any)
- Your general feedback and suggestions

## ⏱️ Time Estimate

This testing should take approximately **10-15 minutes** to complete all steps.

## 🙏 Thank You!

Your feedback is incredibly valuable and helps improve the Icon Library for everyone. Thank you for taking the time to test!

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Popup blocked | Allow popups for this site in browser settings |
| Sign-in button does nothing | Check if popup blocker is enabled |
| Icons won't load | Wait 30 seconds, then refresh; check internet connection |
| Can't find Icon Library button | Check Home tab; try closing and reopening Word/PowerPoint |
| "Missing bearer token" error | Sign out and sign in again |
| Add-in won't install | Make sure manifest.xml is not corrupted; try re-downloading |

## 📱 Contact During Testing

If you get stuck and need immediate help during testing:

- **Email:** [YOUR_EMAIL]
- **Slack:** @yourname (if applicable)
- **Phone:** [YOUR_PHONE] (if applicable)

---

**Version:** 1.0.0
**Last Updated:** 2026-03-30
