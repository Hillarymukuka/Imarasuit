# Automatic Status Updates on Document Conversion

## ✅ **Feature Added: Auto Status Updates**

When you convert a document to the next type in the workflow, the original document's status now automatically updates to reflect that it has been processed.

---

## 🔄 **Document Workflow & Status Changes**

### **Conversion Flow:**
```
Quotation → Invoice → Purchase Order → Delivery Note
```

### **Status Updates:**

#### **1. Quotation → Invoice**
- **Original Quotation** status changes to: **`accepted`**
- **New Invoice** created with status: `draft`

#### **2. Invoice → Purchase Order**
- **Original Invoice** status changes to: **`sent`**
- **New Purchase Order** created with status: `draft`

#### **3. Quotation → Purchase Order** (direct)
- **Original Quotation** status changes to: **`accepted`**
- **New Purchase Order** created with status: `draft`

#### **4. Any Document → Delivery Note**
- **Purchase Order** → status changes to: **`sent`**
- **Invoice** → status changes to: **`sent`**
- **Quotation** → status changes to: **`accepted`**
- **New Delivery Note** created with status: `draft`

---

## 📊 **Status Meanings**

| Status | Meaning |
|--------|---------|
| **draft** | Document is being created/edited |
| **sent** | Document has been sent to client/vendor |
| **accepted** | Document has been accepted/approved |
| **rejected** | Document was rejected |
| **paid** | Invoice has been fully paid |
| **partially_paid** | Invoice has been partially paid |
| **overdue** | Invoice payment is overdue |
| **cancelled** | Document was cancelled |
| **delivered** | Items have been delivered |
| **pending** | Awaiting action |

---

## 🎯 **How It Works**

### **Before:**
```
1. Create Quotation (status: draft)
2. Convert to Invoice
   ❌ Quotation status stays: draft
   ✅ Invoice created: draft
```

### **After:**
```
1. Create Quotation (status: draft)
2. Convert to Invoice
   ✅ Quotation status changes to: accepted
   ✅ Invoice created: draft
```

---

## 💡 **Benefits**

### **1. Better Tracking**
- See at a glance which quotations have been converted
- Know which invoices have been processed
- Track document lifecycle automatically

### **2. Workflow Clarity**
- Clear indication of document progression
- Easy to identify active vs. processed documents
- Better organization

### **3. Automatic Updates**
- No manual status changes needed
- Consistent status tracking
- Reduces human error

### **4. Better Reporting**
- Filter by status to see:
  - Pending quotations (draft)
  - Accepted quotations (accepted)
  - Sent invoices (sent)
  - Processed purchase orders (sent)

---

## 🔍 **Example Scenarios**

### **Scenario 1: Quotation to Invoice**
```
Step 1: Create quotation for Client A
        Status: draft

Step 2: Send quotation to client
        Status: draft (manually change to sent if needed)

Step 3: Client accepts, convert to invoice
        Quotation status: accepted ✅ (automatic)
        Invoice status: draft

Step 4: Send invoice to client
        Invoice status: sent (manually change)
```

### **Scenario 2: Full Workflow**
```
Quotation (draft) 
    ↓ convert
Quotation (accepted) ✅ + Invoice (draft)
    ↓ convert
Invoice (sent) ✅ + Purchase Order (draft)
    ↓ convert
Purchase Order (sent) ✅ + Delivery Note (draft)
```

---

## 🧪 **Testing**

### **To Verify:**

1. **Create a Quotation**
   - Status should be: `draft`

2. **Convert to Invoice**
   - Click menu (⋮) → "Convert to Invoice"
   - Check original quotation status → should be `accepted`
   - New invoice status → should be `draft`

3. **Convert Invoice to Purchase Order**
   - Click menu (⋮) → "Create Purchase Order"
   - Check original invoice status → should be `sent`
   - New PO status → should be `draft`

4. **Convert to Delivery Note**
   - Click menu (⋮) → "Create Delivery Note"
   - Check original document status → should be `sent` or `accepted`
   - New delivery note status → should be `draft`

---

## 🎨 **Visual Indicators**

Status badges will show different colors:

- **Draft** - Gray badge
- **Sent** - Blue badge
- **Accepted** - Green badge
- **Paid** - Green badge
- **Overdue** - Red badge
- **Cancelled** - Red badge

---

## 🔧 **Technical Details**

### **Files Modified:**
`src/store/index.ts`

### **Functions Updated:**

1. **`convertToInvoice()`** - Lines 345-383
   - Added: `get().updateDocumentStatus(quotationId, 'accepted')`

2. **`convertToPurchaseOrder()`** - Lines 385-423
   - Added status update logic based on source type

3. **`convertToDeliveryNote()`** - Lines 425-467
   - Added status update logic based on source type

### **Status Update Logic:**
```typescript
// In convertToInvoice
get().updateDocumentStatus(quotationId, 'accepted');

// In convertToPurchaseOrder
if (source.type === 'invoice') {
  get().updateDocumentStatus(sourceId, 'sent');
} else if (source.type === 'quotation') {
  get().updateDocumentStatus(sourceId, 'accepted');
}

// In convertToDeliveryNote
if (source.type === 'purchase_order') {
  get().updateDocumentStatus(sourceId, 'sent');
} else if (source.type === 'invoice') {
  get().updateDocumentStatus(sourceId, 'sent');
} else if (source.type === 'quotation') {
  get().updateDocumentStatus(sourceId, 'accepted');
}
```

---

## 📋 **Summary**

| Conversion | Original Status | New Document Status |
|------------|----------------|---------------------|
| Quotation → Invoice | `accepted` | `draft` |
| Invoice → PO | `sent` | `draft` |
| Quotation → PO | `accepted` | `draft` |
| PO → Delivery | `sent` | `draft` |
| Invoice → Delivery | `sent` | `draft` |
| Quotation → Delivery | `accepted` | `draft` |

---

## ✨ **Result**

Your document workflow now has **automatic status tracking**! 

- ✅ Quotations automatically marked as `accepted` when converted
- ✅ Invoices automatically marked as `sent` when converted
- ✅ Purchase Orders automatically marked as `sent` when converted
- ✅ Clear visual indication of document progression
- ✅ Better organization and tracking

All changes are **live and working**! 🎉

Just convert any document and watch the original document's status update automatically.
