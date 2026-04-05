import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = (contentType) => {
  const token = localStorage.getItem('session_token');
  const headers = {};
  if (contentType) headers['Content-Type'] = contentType;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export default function CustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/customers`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setSaving(true);

    try {
      const url = editingCustomer 
        ? `${BACKEND_URL}/api/customers/${editingCustomer.customer_id}`
        : `${BACKEND_URL}/api/customers`;
      
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save customer');
      }

      toast.success(editingCustomer ? "Customer updated!" : "Customer created!");
      setShowForm(false);
      setEditingCustomer(null);
      setFormData({ name: "", email: "", phone: "", address: "" });
      fetchCustomers();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        toast.success("Customer deleted");
        fetchCustomers();
        setShowDeleteConfirm(null);
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete customer");
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div data-testid="customer-manager">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-space-mono text-2xl font-bold text-slate-900">Customers</h2>
        <Button 
          onClick={() => { setEditingCustomer(null); setFormData({ name: "", email: "", phone: "", address: "" }); setShowForm(true); }}
          className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
          data-testid="add-customer-btn"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input 
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="search-customers-input"
        />
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#0066cc] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No customers yet</h3>
          <p className="text-slate-500 mb-6">Add your first customer to get started</p>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Customer
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div key={customer.customer_id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0066cc] to-[#10b981] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {customer.name.charAt(0)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-2 text-slate-400 hover:text-[#0066cc] transition-colors"
                    data-testid={`edit-customer-${customer.customer_id}`}
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(customer)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    data-testid={`delete-customer-${customer.customer_id}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{customer.name}</h3>
              {customer.email && (
                <p className="text-sm text-slate-500 mb-1">{customer.email}</p>
              )}
              {customer.phone && (
                <p className="text-sm text-slate-500 mb-1">{customer.phone}</p>
              )}
              {customer.address && (
                <p className="text-sm text-slate-400 mt-2">{customer.address}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Name *</label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer name"
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@example.com"
                  data-testid="customer-email-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Phone</label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+44 123 456 7890"
                  data-testid="customer-phone-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Address</label>
                <Input 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  data-testid="customer-address-input"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
                disabled={saving}
                data-testid="save-customer-btn"
              >
                {saving ? "Saving..." : (editingCustomer ? "Update" : "Add Customer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Customer</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">
              Are you sure you want to delete <span className="font-medium">{showDeleteConfirm.name}</span>? 
              This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleDelete(showDeleteConfirm.customer_id)}
                data-testid="confirm-delete-customer-btn"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
