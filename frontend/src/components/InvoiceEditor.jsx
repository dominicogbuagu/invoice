import { useState, useEffect } from "react";
import { X, Plus, Trash2, Upload, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { xhrPost, xhrPut, BACKEND_URL } from "@/lib/xhr";

const DOCUMENT_TYPES = [
  "Invoice", "Tax Invoice", "Proforma Invoice", "Receipt", 
  "Sales Receipt", "Cash Receipt", "Quote", "Credit Memo",
  "Credit Note", "Purchase Order", "Delivery Note"
];

export default function InvoiceEditor({ invoice, onClose, onSaved, user }) {
  const [loading, setSaving] = useState(false);
  const [showFromSection, setShowFromSection] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  
  const [formData, setFormData] = useState({
    document_type: "Invoice",
    customer_name: "",
    customer_address: "",
    customer_email: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: "",
    tax_rate: 0,
    notes: "",
    terms_conditions: "",
    status: "unpaid",
    items: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
    // From section
    from_company_name: "",
    from_trading_name: "",
    from_registration_number: "",
    from_address: "",
    from_email: "",
    from_phone: "",
    from_tagline: "",
    // Recurring
    recurring: {
      enabled: false,
      frequency: "monthly",
      next_date: "",
      end_date: ""
    }
  });

  useEffect(() => {
    // Set defaults from user profile
    if (user?.company_details) {
      setFormData(prev => ({
        ...prev,
        from_company_name: user.company_details.name || "Realtouch Global Ventures Ltd",
        from_trading_name: user.company_details.trading_name || "",
        from_registration_number: user.company_details.registration_number || "16578193",
        from_address: user.company_details.address || "",
        from_email: user.company_details.email || "",
        from_phone: user.company_details.phone || "",
        from_tagline: user.company_details.tagline || ""
      }));
    }
  }, [user]);

  useEffect(() => {
    if (invoice) {
      setFormData({
        document_type: invoice.document_type || "Invoice",
        customer_name: invoice.customer_name || "",
        customer_address: invoice.customer_address || "",
        customer_email: invoice.customer_email || "",
        invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
        due_date: invoice.due_date || "",
        tax_rate: invoice.tax_rate || 0,
        notes: invoice.notes || "",
        terms_conditions: invoice.terms_conditions || "",
        status: invoice.status || "unpaid",
        items: invoice.items || [{ description: "", quantity: 1, rate: 0, amount: 0 }],
        from_company_name: invoice.from_company_name || "",
        from_trading_name: invoice.from_trading_name || "",
        from_registration_number: invoice.from_registration_number || "",
        from_address: invoice.from_address || "",
        from_email: invoice.from_email || "",
        from_phone: invoice.from_phone || "",
        from_tagline: invoice.from_tagline || "",
        recurring: invoice.recurring || { enabled: false, frequency: "monthly", next_date: "", end_date: "" }
      });
      if (invoice.from_company_name || invoice.from_trading_name) {
        setShowFromSection(true);
      }
      if (invoice.recurring?.enabled) {
        setShowRecurring(true);
      }
    }
  }, [invoice]);

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "rate") {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].rate || 0);
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, rate: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (formData.items.some(item => !item.description.trim())) {
      toast.error("All items must have a description");
      return;
    }

    setSaving(true);

    try {
      const url = invoice 
        ? `${BACKEND_URL}/api/invoices/${invoice.invoice_id}`
        : `${BACKEND_URL}/api/invoices`;
      
      const xhrMethod = invoice ? xhrPut : xhrPost;
      const result = await xhrMethod(url, formData);

      if (!result.ok) {
        throw new Error('Failed to save invoice');
      }

      toast.success(invoice ? "Invoice updated!" : "Invoice created!");
      onSaved();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-100 w-full max-w-5xl rounded-2xl shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white rounded-t-2xl border-b">
          <h2 className="font-space-mono text-xl font-bold text-slate-900">
            {invoice ? `Edit ${invoice.document_type}` : 'Create New Document'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            data-testid="close-editor-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Paper-like Invoice Form */}
        <div className="p-8 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl paper-shadow">
              {/* Blue Header Bar */}
              <div className="h-16 bg-gradient-to-r from-[#0066cc] to-[#0052a3] rounded-t-xl"></div>
              
              <div className="p-8">
                {/* Document Type & From Section Toggle */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <Select 
                      value={formData.document_type} 
                      onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                    >
                      <SelectTrigger className="w-[200px] font-space-mono text-lg font-bold text-[#0066cc] border-0 p-0 h-auto" data-testid="document-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <button 
                      type="button"
                      onClick={() => setShowFromSection(!showFromSection)}
                      className="text-sm text-[#0066cc] hover:underline mt-2 flex items-center gap-1"
                    >
                      {showFromSection ? 'Hide' : 'Edit'} From Details
                    </button>
                  </div>
                  
                  {/* Logo Display */}
                  {user?.company_logo && (
                    <div className="w-20 h-20">
                      <img 
                        src={user.company_logo} 
                        alt="Company Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* From Section (Collapsible) */}
                {showFromSection && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <span className="text-[#0066cc]">●</span> From (Company Details)
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Company Name</Label>
                        <Input 
                          value={formData.from_company_name}
                          onChange={(e) => setFormData({ ...formData, from_company_name: e.target.value })}
                          placeholder="Realtouch Global Ventures Ltd"
                          data-testid="from-company-name"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Trading Name (Optional)</Label>
                        <Input 
                          value={formData.from_trading_name}
                          onChange={(e) => setFormData({ ...formData, from_trading_name: e.target.value })}
                          placeholder="e.g., Realtouch Research and Consulting"
                          data-testid="from-trading-name"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Registration Number</Label>
                        <Input 
                          value={formData.from_registration_number}
                          onChange={(e) => setFormData({ ...formData, from_registration_number: e.target.value })}
                          placeholder="16578193"
                          data-testid="from-reg-number"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Email</Label>
                        <Input 
                          type="email"
                          value={formData.from_email}
                          onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                          placeholder="contact@company.com"
                          data-testid="from-email"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Phone</Label>
                        <Input 
                          value={formData.from_phone}
                          onChange={(e) => setFormData({ ...formData, from_phone: e.target.value })}
                          placeholder="+44 123 456 7890"
                          data-testid="from-phone"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Tagline</Label>
                        <Input 
                          value={formData.from_tagline}
                          onChange={(e) => setFormData({ ...formData, from_tagline: e.target.value })}
                          placeholder="Empowering Growth. Delivering Impact."
                          data-testid="from-tagline"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm">Address</Label>
                        <Textarea 
                          value={formData.from_address}
                          onChange={(e) => setFormData({ ...formData, from_address: e.target.value })}
                          placeholder="Company address"
                          rows={2}
                          data-testid="from-address"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Default Company Display */}
                {!showFromSection && (
                  <div className="mb-6">
                    <p className="font-semibold text-slate-900">{formData.from_trading_name || formData.from_company_name || "Realtouch Global Ventures Ltd"}</p>
                    {formData.from_trading_name && (
                      <p className="text-sm text-slate-500">
                        is a trading name of {formData.from_company_name}, registered in England and Wales, Company No. {formData.from_registration_number}
                      </p>
                    )}
                    {!formData.from_trading_name && (
                      <p className="text-sm text-slate-500">Company No. {formData.from_registration_number || "16578193"}</p>
                    )}
                    {formData.from_tagline && (
                      <p className="text-sm text-[#0066cc] italic mt-1">{formData.from_tagline}</p>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-slate-200 my-6"></div>

                {/* Bill To & Invoice Details */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">BILL TO</label>
                    <Input 
                      placeholder="Customer Name *"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="mb-2"
                      data-testid="customer-name-input"
                    />
                    <Textarea 
                      placeholder="Customer Address"
                      value={formData.customer_address}
                      onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                      rows={2}
                      className="mb-2"
                      data-testid="customer-address-input"
                    />
                    <Input 
                      type="email"
                      placeholder="Customer Email (for sending invoice)"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      data-testid="customer-email-input"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">INVOICE DATE</label>
                        <Input 
                          type="date"
                          value={formData.invoice_date}
                          onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                          className="font-mono text-sm"
                          data-testid="invoice-date-input"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">DUE DATE</label>
                        <Input 
                          type="date"
                          value={formData.due_date}
                          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                          className="font-mono text-sm"
                          data-testid="due-date-input"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">STATUS</label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger data-testid="status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="mb-6">
                  <label className="text-sm font-bold text-slate-700 block mb-3">LINE ITEMS</label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-bold text-slate-600">DESCRIPTION</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-slate-600 w-20">QTY</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-slate-600 w-28">RATE (£)</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-slate-600 w-28">AMOUNT</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">
                              <Input 
                                placeholder="Item description"
                                value={item.description}
                                onChange={(e) => updateItem(index, "description", e.target.value)}
                                className="border-0 p-0 h-auto focus:ring-0"
                                data-testid={`item-description-${index}`}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input 
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                                className="border-0 p-0 h-auto text-right font-mono focus:ring-0"
                                data-testid={`item-quantity-${index}`}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input 
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.rate}
                                onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                                className="border-0 p-0 h-auto text-right font-mono focus:ring-0"
                                data-testid={`item-rate-${index}`}
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-slate-900">
                              £{item.amount.toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              {formData.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                  data-testid={`remove-item-${index}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="mt-3"
                    data-testid="add-item-btn"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Item
                  </Button>
                </div>

                {/* Tax Rate & Totals */}
                <div className="flex justify-between items-start mb-6">
                  <div className="w-64">
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                      TAX RATE (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                        className="w-24 font-mono"
                        data-testid="tax-rate-input"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter tax rate (e.g., 20 for 20% VAT)
                    </p>
                  </div>

                  <div className="w-64 space-y-2 text-right">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-mono">£{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Tax ({formData.tax_rate}%)</span>
                      <span className="font-mono">£{taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>TOTAL</span>
                      <span className="font-mono text-[#0066cc]">£{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Recurring Invoice Toggle */}
                <div className="border-t pt-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-[#0066cc]" />
                      <Label className="font-semibold">Recurring Invoice</Label>
                    </div>
                    <Switch 
                      checked={showRecurring}
                      onCheckedChange={(checked) => {
                        setShowRecurring(checked);
                        setFormData({
                          ...formData,
                          recurring: { ...formData.recurring, enabled: checked }
                        });
                      }}
                    />
                  </div>
                  
                  {showRecurring && (
                    <div className="bg-slate-50 p-4 rounded-lg grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm">Frequency</Label>
                        <Select 
                          value={formData.recurring.frequency}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            recurring: { ...formData.recurring, frequency: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">End Date (Optional)</Label>
                        <Input 
                          type="date"
                          value={formData.recurring.end_date}
                          onChange={(e) => setFormData({
                            ...formData,
                            recurring: { ...formData.recurring, end_date: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes & Terms */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Notes</label>
                    <Textarea 
                      placeholder="Add any additional notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      data-testid="notes-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Terms & Conditions</label>
                    <Textarea 
                      placeholder="Payment terms, conditions..."
                      value={formData.terms_conditions}
                      onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                      rows={3}
                      data-testid="terms-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="cancel-btn"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
                disabled={loading}
                data-testid="save-invoice-btn"
              >
                {loading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Saving...
                  </>
                ) : (
                  invoice ? 'Update Invoice' : 'Save Invoice'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
