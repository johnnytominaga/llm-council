# Mobile Optimization with shadcn/ui

This document describes the mobile-first responsive design implementation using shadcn/ui components.

## Overview

The LLM Council app is now fully optimized for mobile devices with a responsive drawer-based navigation system using shadcn/ui components.

## Implementation

### shadcn/ui Integration

**Installed Components:**
- `drawer` - Mobile-optimized slide-up navigation panel
- `button` - Consistent button styling across the app
- Utility functions (`cn`, `clsx`, `tailwind-merge`) for className management

**Dependencies Added:**
```json
{
  "clsx": "^2.x",
  "tailwind-merge": "^2.x",
  "class-variance-authority": "^0.7.x",
  "vaul": "^0.9.x" (drawer component)
}
```

### Responsive Breakpoint

**Mobile**: `< 768px` (max-width: 767px)
**Desktop**: `>= 768px`

### Desktop View (≥768px)

**Sidebar:**
- Fixed left sidebar (260px width)
- Always visible
- Traditional desktop layout
- Conversation list, new conversation button
- Title editing inline

**Layout:**
```
┌─────────┬────────────────────────┐
│ Sidebar │   Chat Interface       │
│         │                        │
│  List   │   Messages             │
│         │                        │
│         │   Input                │
└─────────┴────────────────────────┘
```

### Mobile View (<768px)

**Sidebar:**
- Hidden by default
- Accessible via hamburger menu button (top-left)
- Slides up from bottom as a drawer
- Drawer closes after selecting a conversation
- Max height: 80vh for scrolling

**Menu Button:**
- Fixed position: `top-4 left-4`
- Z-index: 50 (always on top)
- Hamburger icon (3 horizontal lines)
- White background with shadow

**Layout:**
```
┌────────────────────────────────┐
│ ☰  (Menu Button)               │
│                                │
│    Chat Interface (Full Width) │
│                                │
│    Messages                    │
│                                │
│    Input                       │
└────────────────────────────────┘
```

**Drawer Open:**
```
┌────────────────────────────────┐
│                                │
│    Chat Interface (Dimmed)     │
│                                │
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │  LLM Council               │ │
│ │  + New Conversation        │ │
│ ├────────────────────────────┤ │
│ │  Conversation 1            │ │
│ │  Conversation 2            │ │
│ │  Conversation 3            │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

## Component Changes

### `components/Sidebar.tsx`

**Desktop Rendering:**
```tsx
return <div className="sidebar">{sidebarContent}</div>;
```

**Mobile Rendering:**
```tsx
<Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
  <DrawerTrigger asChild>
    <Button variant="outline" size="icon" className="mobile-menu-btn">
      {/* Hamburger Icon */}
    </Button>
  </DrawerTrigger>
  <DrawerContent>
    <div className="sidebar-drawer">{sidebarContent}</div>
  </DrawerContent>
</Drawer>
```

**Key Features:**
- `useEffect` hook detects screen size and updates `isMobile` state
- Window resize listener updates mobile state dynamically
- Shared `sidebarContent` component used in both desktop and mobile
- Drawer auto-closes after conversation selection on mobile
- Conditional rendering based on `isMobile` state

### Mobile Responsive Adjustments

**Spacing & Padding:**
- Messages container: `padding: 16px 12px` (reduced from 24px)
- Top padding: `70px` to account for fixed menu button
- Input area: `padding: 12px` (reduced)
- Stages: `margin-bottom: 16px` (reduced)

**Typography:**
- Stage titles: `16px` (down from 18px)
- Tabs: `13px` (down from 14px)
- Empty state heading: `20px` (down from 24px)

**Tabs:**
- Horizontal scrolling enabled
- `-webkit-overflow-scrolling: touch` for smooth iOS scrolling
- `white-space: nowrap` prevents tab text wrapping

**Touch Targets:**
- Tabs: `padding: 10px 16px` (increased for better touch)
- Buttons maintain minimum 44x44px touch area

## CSS Classes

### New Classes

**`.mobile-menu-btn`**
```css
.mobile-menu-btn {
  background: white;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

**`.sidebar-drawer`**
```css
.sidebar-drawer {
  max-height: 80vh;
  overflow-y: auto;
  padding: 0;
}
```

**`.sidebar-drawer .sidebar-header`**
```css
.sidebar-drawer .sidebar-header {
  position: sticky;
  top: 0;
  background: #f8f8f8;
  z-index: 10;
  border-bottom: 1px solid #e0e0e0;
}
```

### Media Query

```css
@media (max-width: 767px) {
  .sidebar {
    display: none; /* Hide desktop sidebar */
  }

  .chat-interface {
    width: 100%; /* Full width chat */
  }

  /* ... other mobile adjustments */
}
```

## User Experience

### Mobile Workflow

1. **Open App**: Full-screen chat interface with menu button
2. **Access Conversations**: Tap hamburger menu (top-left)
3. **Drawer Opens**: Slides up from bottom
4. **Select Conversation**: Tap any conversation
5. **Drawer Closes**: Automatically, returns to chat
6. **Create New**: Tap "+ New Conversation" in drawer

### Desktop Workflow

1. **Open App**: Split view (sidebar + chat)
2. **Always Visible**: No need to open/close menu
3. **Click Conversations**: Directly in left sidebar
4. **Traditional Layout**: No overlays or drawers

## Accessibility

**Screen Readers:**
- Drawer has proper ARIA labels
- `DrawerTitle` and `DrawerDescription` hidden visually but available to screen readers
- `sr-only` class for screen reader only content

**Keyboard Navigation:**
- Drawer can be opened/closed with keyboard
- Focus management handled by shadcn drawer component
- Tab navigation works correctly

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Increased padding on mobile for easier tapping

## Performance

**Lazy Loading:**
- shadcn components are tree-shakeable
- Only imported components are bundled

**Bundle Size Impact:**
- `vaul` (drawer): ~15KB gzipped
- `class-variance-authority`: ~5KB gzipped
- Total increase: ~20KB gzipped

**Runtime Performance:**
- Window resize listener debounced implicitly by React
- Drawer animations use CSS transforms (GPU accelerated)
- No layout recalculations during drawer animation

## Browser Support

**Desktop:**
- Chrome, Firefox, Safari, Edge (latest 2 versions)

**Mobile:**
- iOS Safari 12+
- Chrome Android 90+
- Samsung Internet 12+

**Drawer Animations:**
- Smooth on all modern browsers
- Fallback to instant open/close on older browsers

## Configuration

### Changing Breakpoint

To change the mobile breakpoint, update:

1. **CSS** (`app/globals.css`):
```css
@media (max-width: 767px) { /* Change to your breakpoint */ }
```

2. **JavaScript** (`components/Sidebar.tsx`):
```typescript
const checkMobile = () => {
  setIsMobile(window.innerWidth < 768); // Change to match CSS
};
```

### Customizing Drawer

**Height:**
```css
.sidebar-drawer {
  max-height: 80vh; /* Adjust as needed */
}
```

**Animation Speed:**
Controlled by `vaul` package, customize via drawer props:
```tsx
<Drawer duration={0.3}> {/* seconds */}
```

## Testing

### Desktop Testing
1. Open app in browser (width >= 768px)
2. Verify sidebar visible
3. Click conversations - should switch immediately
4. No drawer/menu button visible

### Mobile Testing
1. Open app in browser (width < 768px) or mobile device
2. Verify sidebar hidden
3. Verify menu button visible (top-left)
4. Tap menu - drawer should slide up
5. Select conversation - drawer should close
6. Chat should fill full width

### Responsive Testing
1. Resize browser from desktop → mobile
2. Verify sidebar disappears
3. Verify menu button appears
4. Resize mobile → desktop
5. Verify menu button disappears
6. Verify sidebar appears

## Troubleshooting

### Issue: Drawer not opening on mobile

**Check:**
1. Browser width < 768px?
2. `isMobile` state updating correctly?
3. Console errors from shadcn components?

**Fix:**
- Add `console.log(isMobile)` to verify state
- Check browser console for errors
- Ensure `vaul` package installed

### Issue: Menu button visible on desktop

**Check:**
1. CSS media query correct?
2. Window resize listener working?

**Fix:**
- Verify `@media (max-width: 767px)` in CSS
- Add `console.log` in resize handler
- Hard refresh browser (Ctrl+F5)

### Issue: Drawer doesn't close after selection

**Check:**
1. `handleSelectConversation` calling `setIsDrawerOpen(false)`?
2. `isMobile` check working?

**Fix:**
- Verify function in `Sidebar.tsx` line 79-84
- Test `isMobile` state value

## Future Enhancements

Potential improvements:
1. **Swipe gestures**: Swipe from edge to open drawer
2. **Persistent state**: Remember drawer state across refreshes
3. **Drawer width**: Adjustable drawer width on larger mobile devices
4. **Tablet optimization**: Different layout for tablets (768-1024px)
5. **Dark mode**: Mobile-optimized dark theme
6. **Pull to refresh**: Mobile pull-to-refresh for conversation list

## Summary

The mobile optimization provides:
- ✅ **Clean mobile UI**: Full-width chat, minimal clutter
- ✅ **Easy navigation**: Quick access to conversations via drawer
- ✅ **Responsive**: Auto-adapts to screen size
- ✅ **Modern**: Uses shadcn/ui for consistent design
- ✅ **Accessible**: ARIA labels and keyboard navigation
- ✅ **Performant**: Smooth animations, small bundle increase

The app now works beautifully on all devices from phones to desktops!
