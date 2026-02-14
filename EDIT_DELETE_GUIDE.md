# Edit & Delete Functionality - Complete Guide

## 🎯 Overview

Implemented full Edit and Delete functionality for startup posts, matching the yc_directory Next.js implementation with a native mobile UX.

---

## ✨ Features Implemented

### 1. **Three-Dots Menu (KebabMenu)**
- Shows only for post authors (logged-in user owns the post)
- Positioned in top-right of post detail screen
- Clean dropdown menu with:
  - ✏️ **Edit** option (blue)
  - 🗑️ **Delete** option (red)

### 2. **Edit Post Flow**
- Navigate to edit screen with pre-filled form
- All fields populated with existing data
- Update button instead of Create button
- Success alert after update
- Navigate back to post detail

### 3. **Delete Post Flow**
- Confirmation alert before deletion
- Delete from Sanity database
- Success feedback
- Navigate to home screen
- Post removed from all feeds

---

## 📂 Files Created/Modified

### **New Files Created:**

1. **KebabMenu.tsx** - Three-dots menu component
   - Location: `src/components/KebabMenu.tsx`
   - Features: Edit/Delete options, confirmation dialogs, loading states

2. **EditPostScreen.tsx** - Edit post screen
   - Location: `src/screens/EditPostScreen.tsx`
   - Features: Fetches post data, authorization check, pre-fills form

### **Files Modified:**

1. **StartupDetailScreen.tsx**
   - Added KebabMenu import
   - Added menu to hero section (only shows for author)
   - Authorization check: `user?._id === startup.author._id`

2. **PostForm.tsx**
   - Added props for edit mode: `existingData` and `isEdit`
   - Modified `handleSubmit` to handle both create and update
   - Dynamic button text: "Publish Startup" vs "Update Startup"
   - Update uses `sanityWriteClient.patch()` instead of `create()`

3. **AppNavigator.tsx**
   - Added EditPostScreen import
   - Registered EditPost screen in Stack.Navigator
   - Added to screensWithoutTabs list

---

## 🔧 How It Works

### **Authorization Pattern** (from yc_directory)

```typescript
// In StartupDetailScreen
const isAuthor = user?._id === startup.author._id;

// Only show menu if author
{isAuthor && (
  <View style={styles.kebabMenuContainer}>
    <KebabMenu 
      startupId={id} 
      onDeleteSuccess={() => navigation.navigate('Home')}
    />
  </View>
)}
```

### **Edit Flow**

```typescript
// 1. User clicks Edit in KebabMenu
handleEdit = () => {
  setMenuVisible(false);
  navigation.navigate('EditPost', {id: startupId});
};

// 2. EditPostScreen fetches post data
const data = await sanityClient.fetch(STARTUP_BY_ID_QUERY, {id});

// 3. Check authorization
if (data.author._id !== user?._id) {
  Alert.alert('Unauthorized', 'You can only edit your own posts');
  return;
}

// 4. Pass to PostForm with existingData
<PostForm
  existingData={{
    _id: startup._id,
    title: startup.title,
    description: startup.description,
    category: startup.category,
    image: startup.image,
    pitch: startup.pitch,
    tags: startup.tags || [],
  }}
  isEdit={true}
/>

// 5. PostForm updates using patch()
await sanityWriteClient
  .patch(existingData._id)
  .set(updateData)
  .commit();
```

### **Delete Flow**

```typescript
// 1. User clicks Delete in KebabMenu
handleDelete = () => {
  Alert.alert(
    'Delete Startup',
    'Are you sure? This action cannot be undone.',
    [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: confirmDelete}
    ]
  );
};

// 2. Confirm and delete from Sanity
const confirmDelete = async () => {
  await sanityWriteClient.delete(startupId);
  
  Alert.alert('Success', 'Startup deleted successfully', [
    {text: 'OK', onPress: () => navigation.goBack()}
  ]);
};
```

---

## 🎨 UI/UX Design

### **KebabMenu Button**
```
┌─────┐
│ ⋮   │ ← Three vertical dots
└─────┘
```

**Styling:**
- 36x36 circular button
- White/card background
- Subtle border and shadow
- Top-right position (absolute)
- Padding: 16px from top/right

### **Dropdown Menu**
```
┌──────────────────┐
│  ✏️  Edit        │ ← Blue icon/text
├──────────────────┤
│  🗑️  Delete      │ ← Red icon/text
└──────────────────┘
```

**Features:**
- Fade animation
- Click outside to close
- Icon + text for each option
- Colored circular icon backgrounds
- Hover/press states

---

## 🧪 Testing Guide

### Test 1: View Three-Dots Menu

**As Post Owner:**
1. Create a new post
2. Open the post detail
3. ✅ See three-dots menu in top-right corner
4. Tap the menu
5. ✅ See Edit and Delete options

**As Non-Owner:**
1. View someone else's post
2. ✅ NO three-dots menu visible

### Test 2: Edit Post Flow

1. Open your own post
2. Tap three-dots → Edit
3. ✅ Navigate to edit screen
4. ✅ All fields pre-filled with current data
5. Modify title: "Updated Startup"
6. Tap "Update Startup"
7. ✅ See "✅ Post Updated!" alert
8. Tap "View Post"
9. ✅ See updated changes in detail view

### Test 3: Delete Post Flow

1. Open your own post
2. Tap three-dots → Delete
3. ✅ Confirmation alert appears
4. Tap "Cancel" → ✅ Alert dismisses, no action
5. Tap three-dots → Delete again
6. Tap "Delete" (destructive action)
7. ✅ See "Success" alert
8. Tap "OK"
9. ✅ Navigate to home
10. ✅ Post no longer in feed

### Test 4: Authorization

**Try to edit someone else's post:**
1. Navigate directly to EditPost screen with someone else's post ID
2. ✅ Alert: "Unauthorized - You can only edit your own posts"
3. ✅ Navigate back automatically

---

## 📊 Comparison: yc_directory vs Viora

| Feature | yc_directory (Next.js) | Viora (React Native) |
|---------|----------------------|----------------------|
| Menu Component | `<MoreVertical />` button | Same MoreVertical icon |
| Menu Type | Dropdown (shadcn) | Modal menu |
| Edit Navigation | `/startup/[id]/edit` | `EditPost` screen |
| Delete Action | Server action | Direct Sanity delete |
| Authorization | Server-side check | Client + screen check |
| Feedback | Toast notification | Alert dialog |
| Animation | Slide/fade | Fade modal |

---

## 🚀 User Experience Flow

### **Complete Edit Journey**

```
User's Post Detail
       ↓ (tap three-dots)
   Opens Menu
       ↓ (tap Edit)
   Edit Screen
   (Pre-filled Form)
       ↓ (modify & submit)
   "✅ Post Updated!"
       ↓ (tap View Post)
   Back to Detail
   (Shows updates!)
```

### **Complete Delete Journey**

```
User's Post Detail
       ↓ (tap three-dots)
   Opens Menu
       ↓ (tap Delete)
   Confirmation Alert
   "Are you sure?"
       ↓ (tap Delete)
   "Success!"
       ↓ (tap OK)
   Navigate to Home
   (Post removed!)
```

---

## 🎬 Demo Scenarios

### Scenario 1: Quick Edit
```
"I made a typo in my startup title"
→ Open post → Three-dots → Edit
→ Fix typo → Update → Done! ✅
```

### Scenario 2: Major Changes
```
"I want to change category and add more tags"
→ Open post → Three-dots → Edit
→ Change category, add tags, update description
→ Update → View updated post ✅
```

### Scenario 3: Remove Old Post
```
"This startup is no longer active"
→ Open post → Three-dots → Delete
→ Confirm → Post removed from feeds ✅
```

---

## 🔒 Security Features

1. ⁣**Client-Side Authorization**
   - Menu only renders if `user._id === author._id`
   - No accidental exposure to non-owners

2. **Screen-Level Authorization**
   - EditPostScreen checks ownership on load
   - Redirects unauthorized users immediately

3. **Server-Side Validation** (Sanity)
   - Write token required for all mutations
   - Sanity permissions enforced on backend

---

## 🐛 Error Handling

### Edit Screen Errors

**Startup Not Found:**
```typescript
Alert.alert('Error', 'Startup not found', [
  {text: 'OK', onPress: () => navigation.goBack()}
]);
```

**Unauthorized Access:**
```typescript
Alert.alert('Unauthorized', 'You can only edit your own posts', [
  {text: 'OK', onPress: () => navigation.goBack()}
]);
```

**Update Failed:**
```typescript
Alert.alert('Error', 'Failed to update post. Please try again.', [
  {text: 'OK'}
]);
```

### Delete Errors

**Delete Failed:**
```typescript
Alert.alert('Error', 'Failed to delete startup. Please try again.', [
  {text: 'OK'}
]);
// User stays on detail screen to retry
```

---

## 📝 Code Architecture

### Component Hierarchy
```
StartupDetailScreen
  └── KebabMenu (if isAuthor)
        ├── Edit Option → EditPostScreen
        │                   └── PostForm (isEdit=true)
        └── Delete Option → Confirmation → Delete
```

### Data Flow
```
1. Fetch Post → Check Author → Show/Hide Menu
2. Edit: Fetch Full Data → Pre-fill Form → Update
3. Delete: Confirm → Delete from DB → Navigate Away
```

---

## ✅ Completion Checklist

✅ KebabMenu component created  
✅ Edit/Delete options styled  
✅ Authorization checks implemented  
✅ EditPostScreen created  
✅ PostForm supports edit mode  
✅ Update logic with patch()  
✅ Delete logic with confirmation  
✅ Navigation registered  
✅ Alerts for user feedback  
✅ Error handling  
✅ Loading states  
✅ Complete documentation  

---

## 🎉 Summary

**What Users Can Now Do:**
- ✏️ Edit their own posts with pre-filled data
- 🗑️ Delete their own posts with confirmation
- 👀 See three-dots menu only on their posts
- ✅ Get clear feedback for all actions
- 🔒 Cannot edit/delete others' posts

**What Matches yc_directory:**
- Same three-dots menu pattern
- Same edit/delete flow
- Same authorization logic
- Same user experience pattern
- Mobile-optimized native feel

**Ready to test!** Create a post, open it, and see the three-dots menu in action! 🚀
