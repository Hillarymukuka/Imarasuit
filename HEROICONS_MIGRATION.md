# Migrating from Lucide Icons to Heroicons

## ✅ **Heroicons Installed**

Heroicons v2 has been successfully installed in your project.

---

## 📦 **What is Heroicons?**

Heroicons is a set of free MIT-licensed high-quality SVG icons created by the makers of Tailwind CSS. It comes in three styles:
- **Outline** - 24x24 stroke-based icons (default)
- **Solid** - 24x24 filled icons
- **Mini** - 20x20 solid icons

---

## 🔄 **Icon Mapping Guide**

### **Common Icons:**

| Lucide Icon | Heroicon Outline | Heroicon Solid |
|-------------|------------------|----------------|
| `LayoutDashboard` | `Squares2X2Icon` | `Squares2X2Icon` (solid) |
| `FileText` | `DocumentTextIcon` | `DocumentTextIcon` (solid) |
| `Receipt` | `ReceiptPercentIcon` | `ReceiptPercentIcon` (solid) |
| `ShoppingCart` | `ShoppingCartIcon` | `ShoppingCartIcon` (solid) |
| `Truck` | `TruckIcon` | `TruckIcon` (solid) |
| `Users` | `UsersIcon` | `UsersIcon` (solid) |
| `Building2` | `BuildingOfficeIcon` | `BuildingOfficeIcon` (solid) |
| `Settings` | `Cog6ToothIcon` | `Cog6ToothIcon` (solid) |
| `Mail` | `EnvelopeIcon` | `EnvelopeIcon` (solid) |
| `Plus` | `PlusIcon` | `PlusIcon` (solid) |
| `X` | `XMarkIcon` | `XMarkIcon` (solid) |
| `Eye` | `EyeIcon` | `EyeIcon` (solid) |
| `Edit` | `PencilIcon` | `PencilIcon` (solid) |
| `Trash2` | `TrashIcon` | `TrashIcon` (solid) |
| `Download` | `ArrowDownTrayIcon` | `ArrowDownTrayIcon` (solid) |
| `Save` | `DocumentCheckIcon` | `DocumentCheckIcon` (solid) |
| `Search` | `MagnifyingGlassIcon` | `MagnifyingGlassIcon` (solid) |
| `Filter` | `FunnelIcon` | `FunnelIcon` (solid) |
| `ArrowRight` | `ArrowRightIcon` | `ArrowRightIcon` (solid) |
| `ArrowLeft` | `ArrowLeftIcon` | `ArrowLeftIcon` (solid) |
| `ChevronRight` | `ChevronRightIcon` | `ChevronRightIcon` (solid) |
| `TrendingUp` | `ArrowTrendingUpIcon` | `ArrowTrendingUpIcon` (solid) |
| `Clock` | `ClockIcon` | `ClockIcon` (solid) |
| `DollarSign` | `CurrencyDollarIcon` | `CurrencyDollarIcon` (solid) |
| `AlertCircle` | `ExclamationCircleIcon` | `ExclamationCircleIcon` (solid) |
| `CheckCircle2` | `CheckCircleIcon` | `CheckCircleIcon` (solid) |
| `BarChart3` | `ChartBarIcon` | `ChartBarIcon` (solid) |
| `MoreVertical` | `EllipsisVerticalIcon` | `EllipsisVerticalIcon` (solid) |

---

## 💻 **How to Import**

### **Outline Icons (24x24, stroke-based):**
```tsx
import {
  Squares2X2Icon,
  DocumentTextIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
```

### **Solid Icons (24x24, filled):**
```tsx
import {
  Squares2X2Icon,
  DocumentTextIcon,
  EnvelopeIcon
} from '@heroicons/react/24/solid';
```

### **Mini Icons (20x20, solid):**
```tsx
import {
  Squares2X2Icon,
  DocumentTextIcon,
  EnvelopeIcon
} from '@heroicons/react/20/solid';
```

---

## 🔧 **Migration Examples**

### **Example 1: Sidebar.tsx**

#### **Before (Lucide):**
```tsx
import { 
  LayoutDashboard, 
  FileText, 
  Receipt, 
  ShoppingCart, 
  Truck,
  Users,
  Building2,
  Settings,
  X,
  ChevronRight,
  Mail
} from 'lucide-react';

const mainNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
];
```

#### **After (Heroicons):**
```tsx
import { 
  Squares2X2Icon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  ShoppingCartIcon,
  TruckIcon,
  UsersIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ChevronRightIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

const mainNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <Squares2X2Icon className="w-5 h-5" /> },
];
```

### **Example 2: Dashboard Page**

#### **Before (Lucide):**
```tsx
import { 
  FileText, 
  Receipt, 
  ShoppingCart, 
  Truck,
  Plus,
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
```

#### **After (Heroicons):**
```tsx
import { 
  DocumentTextIcon,
  ReceiptPercentIcon,
  ShoppingCartIcon,
  TruckIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
```

### **Example 3: Buttons with Icons**

#### **Before (Lucide):**
```tsx
<Button>
  <Plus className="w-4 h-4 mr-2" />
  New Letter
</Button>
```

#### **After (Heroicons):**
```tsx
<Button>
  <PlusIcon className="w-4 h-4 mr-2" />
  New Letter
</Button>
```

---

## 🎨 **Styling Differences**

### **Size Classes:**
- Heroicons work the same way with Tailwind classes
- Use `w-4 h-4`, `w-5 h-5`, `w-6 h-6`, etc.
- No changes needed to your existing size classes

### **Color Classes:**
- Use `text-primary-600`, `text-white`, etc.
- Same as Lucide icons
- No changes needed

---

## 📝 **Migration Checklist**

To migrate your entire app, update these files:

### **Layout Components:**
- [ ] `src/components/layout/Sidebar.tsx`
- [ ] `src/components/layout/Header.tsx`

### **Page Components:**
- [ ] `src/app/page.tsx` (Dashboard)
- [ ] `src/app/quotations/page.tsx`
- [ ] `src/app/invoices/page.tsx`
- [ ] `src/app/purchase-orders/page.tsx`
- [ ] `src/app/delivery-notes/page.tsx`
- [ ] `src/app/letters/page.tsx`
- [ ] `src/app/letters/new/page.tsx`
- [ ] `src/app/letters/[id]/page.tsx`
- [ ] `src/app/letters/[id]/edit/page.tsx`
- [ ] `src/app/clients/page.tsx`
- [ ] `src/app/company/page.tsx`
- [ ] `src/app/settings/page.tsx`

### **UI Components:**
- [ ] `src/components/ui/Button.tsx` (if icons used)
- [ ] `src/components/ui/Input.tsx` (if icons used)
- [ ] `src/components/documents/DocumentList.tsx`
- [ ] `src/components/documents/DocumentPreview.tsx`
- [ ] Any other components using icons

---

## 🚀 **Quick Migration Steps**

### **Step 1: Find & Replace Imports**

In each file:
1. Remove Lucide import
2. Add Heroicons import
3. Update icon names

### **Step 2: Update Icon Names**

Use the mapping table above to replace:
- `LayoutDashboard` → `Squares2X2Icon`
- `FileText` → `DocumentTextIcon`
- `Mail` → `EnvelopeIcon`
- etc.

### **Step 3: Test**

1. Check each page
2. Verify icons display correctly
3. Check icon sizes and colors
4. Test dark mode

---

## 💡 **Recommendations**

### **Use Outline Icons for:**
- Navigation menus
- Buttons
- List items
- General UI elements

### **Use Solid Icons for:**
- Active states
- Badges
- Filled buttons
- Emphasis areas

### **Use Mini Icons for:**
- Small buttons
- Inline text icons
- Compact UIs

---

## 🎯 **Example: Updated Sidebar**

I can update the Sidebar.tsx file as an example. Would you like me to:
1. Update just the Sidebar as an example?
2. Update all files automatically?
3. Provide a script to help with migration?

---

## 📚 **Resources**

- **Heroicons Website:** https://heroicons.com/
- **Browse Icons:** https://heroicons.com/
- **GitHub:** https://github.com/tailwindlabs/heroicons
- **Documentation:** https://github.com/tailwindlabs/heroicons#react

---

## ✅ **Next Steps**

1. **Review the icon mapping table** above
2. **Decide which style** to use (outline, solid, or mini)
3. **Let me know** if you want me to:
   - Update specific files
   - Update all files
   - Create a migration script

The Heroicons package is **installed and ready to use**! 🎉
