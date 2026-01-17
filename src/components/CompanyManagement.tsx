import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Building2, Plus, Edit, Trash2, Search, Users, Mail, Phone, X, Save } from 'lucide-react';
import { companyApi } from '../lib/api';
import type { Company, Contact } from '../lib/types';

// ESC key handler component
function EscKeyHandler({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  return null;
}

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });

  const [contactForm, setContactForm] = useState({
    companyId: '',
    name: '',
    position: '',
    email: '',
    phone: '',
    isPrimary: false,
  });

  // Fetch companies from API
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch all contacts when contacts tab is active
  const fetchAllContacts = async () => {
    try {
      const allContacts: Contact[] = [];
      for (const company of companies) {
        const response = await companyApi.getContacts(company.id);
        if (response.success && response.data) {
          // Transform snake_case to camelCase
          const companyContacts = (response.data || []).map((contact: any) => ({
            id: contact.id,
            companyId: contact.company_id || contact.companyId,
            firstName: contact.first_name || contact.firstName,
            lastName: contact.last_name || contact.lastName,
            email: contact.email,
            phone: contact.phone,
            mobile: contact.mobile,
            position: contact.position,
            department: contact.department,
            isPrimary: contact.is_primary === 1 || contact.is_primary === true || contact.isPrimary === true,
            notes: contact.notes,
            createdAt: contact.created_at || contact.createdAt,
            updatedAt: contact.updated_at || contact.updatedAt,
            companyName: company.companyName, // Add company name for display
          }));
          allContacts.push(...companyContacts);
        }
      }
      setContacts(allContacts);
    } catch (err: any) {
      // Error handled silently
    }
  };

  useEffect(() => {
    if (companies.length > 0) {
      fetchAllContacts();
    }
  }, [companies]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyApi.getAll();
      if (response.success && response.data) {
        // Transform snake_case to camelCase if needed
        const companiesData = response.data.data || response.data || [];
        const transformed = companiesData.map((company: any) => ({
          id: company.id,
          companyName: company.company_name || company.companyName,
          industry: company.industry,
          website: company.website,
          phone: company.phone,
          email: company.email,
          address: company.address,
          city: company.city,
          state: company.state,
          country: company.country,
          postalCode: company.postal_code || company.postalCode,
          taxId: company.tax_id || company.taxId,
          status: company.status || 'Active',
          createdAt: company.created_at || company.createdAt,
          updatedAt: company.updated_at || company.updatedAt,
        }));
        setCompanies(transformed);
      } else {
        setError(response.error || 'Failed to load companies');
      }
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (companyId: number) => {
    try {
      const response = await companyApi.getContacts(companyId);
      if (response.success && response.data) {
        setContacts(response.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
    }
  };

  const handleAddCompany = async () => {
    if (!companyForm.name) {
      setError('Company name is required');
      return;
    }

    try {
      // Map frontend form fields to backend API expected fields
      const response = await companyApi.create({
        companyName: companyForm.name, // Backend expects 'companyName', not 'name'
        industry: companyForm.industry || null,
        address: companyForm.address || null,
        phone: companyForm.phone || null,
        email: companyForm.email || null,
        website: companyForm.website || null,
      });
      if (response.success) {
        await fetchCompanies();
        setIsAddCompanyOpen(false);
        setCompanyForm({
          name: '',
          industry: '',
          address: '',
          phone: '',
          email: '',
          website: '',
        });
        setError(null);
      } else {
        setError(response.error || 'Failed to create company');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.companyId || !contactForm.name || !contactForm.email) {
      setError('Company, name, and email are required');
      return;
    }

    try {
      // Split name into firstName and lastName (backend expects these)
      const nameParts = contactForm.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await companyApi.addContact(parseInt(contactForm.companyId), {
        firstName: firstName,
        lastName: lastName,
        position: contactForm.position || null,
        email: contactForm.email,
        phone: contactForm.phone || null,
        isPrimary: contactForm.isPrimary,
      });

      if (response.success) {
        await fetchCompanies(); // Refresh companies to trigger contacts refresh
        setIsAddContactOpen(false);
        setContactForm({
          companyId: '',
          name: '',
          position: '',
          email: '',
          phone: '',
          isPrimary: false,
        });
        setError(null);
      } else {
        setError(response.error || 'Failed to create contact');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create contact');
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.companyName,
      industry: company.industry || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
    });
    setIsEditCompanyOpen(true);
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany || !companyForm.name) {
      setError('Company name is required');
      return;
    }

    try {
      const response = await companyApi.update(editingCompany.id, {
        companyName: companyForm.name,
        industry: companyForm.industry || null,
        address: companyForm.address || null,
        phone: companyForm.phone || null,
        email: companyForm.email || null,
        website: companyForm.website || null,
      });
      if (response.success) {
        await fetchCompanies();
        setIsEditCompanyOpen(false);
        setEditingCompany(null);
        setCompanyForm({
          name: '',
          industry: '',
          address: '',
          phone: '',
          email: '',
          website: '',
        });
        setError(null);
      } else {
        setError(response.error || 'Failed to update company');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update company');
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    const companyId = contact.companyId || companies.find(c => c.companyName === (contact as any).companyName)?.id;
    setContactForm({
      companyId: companyId?.toString() || '',
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      position: contact.position || '',
      email: contact.email || '',
      phone: contact.phone || '',
      isPrimary: contact.isPrimary,
    });
    setIsEditContactOpen(true);
  };

  const handleUpdateContact = async () => {
    if (!editingContact || !contactForm.companyId || !contactForm.name || !contactForm.email) {
      setError('Company, name, and email are required');
      return;
    }

    try {
      const nameParts = contactForm.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const companyId = editingContact.companyId || parseInt(contactForm.companyId);
      const response = await companyApi.updateContact(companyId, editingContact.id, {
        firstName: firstName,
        lastName: lastName,
        position: contactForm.position || null,
        email: contactForm.email,
        phone: contactForm.phone || null,
        isPrimary: contactForm.isPrimary,
      });

      if (response.success) {
        await fetchCompanies(); // Refresh companies to trigger contacts refresh
        setIsEditContactOpen(false);
        setEditingContact(null);
        setContactForm({
          companyId: '',
          name: '',
          position: '',
          email: '',
          phone: '',
          isPrimary: false,
        });
        setError(null);
      } else {
        setError(response.error || 'Failed to update contact');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update contact');
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const companyId = contact.companyId || companies.find(c => c.companyName === (contact as any).companyName)?.id;
      if (!companyId) {
        setError('Company not found for this contact');
        return;
      }

      const response = await companyApi.deleteContact(companyId, contact.id);
      if (response.success) {
        await fetchCompanies(); // Refresh companies to trigger contacts refresh
      } else {
        setError(response.error || 'Failed to delete contact');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact');
    }
  };

  const handleDeleteCompany = async (companyId: number) => {
    if (!confirm('Are you sure you want to delete this company?')) {
      return;
    }

    try {
      const response = await companyApi.delete(companyId);
      if (response.success) {
        await fetchCompanies();
      } else {
        setError(response.error || 'Failed to delete company');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete company');
    }
  };

  const filteredCompanies = companies.filter((company) =>
    (company.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Companies & Contacts
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading companies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Companies & Contacts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage client companies and contact information
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </Card>
          )}

          <Tabs defaultValue="companies" className="w-full">
            <TabsList>
              <TabsTrigger value="companies">
                <Building2 className="w-4 h-4" />
                Companies
              </TabsTrigger>
              <TabsTrigger value="contacts">
                <Users className="w-4 h-4" />
                Contacts
              </TabsTrigger>
            </TabsList>

            {/* Companies Tab */}
            <TabsContent value="companies" className="space-y-4 mt-4">

              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search companies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={() => setIsAddCompanyOpen(!isAddCompanyOpen)} data-testid="btn-add-company">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Company
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-muted-foreground">No companies found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCompanies.map((company) => (
                          <TableRow key={company.id}>
                            <TableCell>
                              <div>
                                <p>{company.companyName}</p>
                                {company.website && (
                                  <p className="text-sm text-muted-foreground">
                                    {company.website}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{company.industry || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {company.email && (
                                  <p className="text-sm flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {company.email}
                                  </p>
                                )}
                                {company.phone && (
                                  <p className="text-sm flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {company.phone}
                                  </p>
                                )}
                                {!company.email && !company.phone && (
                                  <p className="text-sm text-muted-foreground">N/A</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  company.status === 'Active'
                                    ? 'bg-white text-emerald-700 border border-emerald-200'
                                    : 'bg-white text-gray-500 border border-gray-200'
                                }
                              >
                                {company.status || 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedCompanyId(company.id)}
                                >
                                  <Users className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCompany(company)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteCompany(company.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="space-y-4 mt-4">

              <Card className="p-4">
                <div className="flex justify-end mb-4">
                  <Button onClick={() => setIsAddContactOpen(!isAddContactOpen)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-muted-foreground">No contacts found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        contacts.map((contact: any) => (
                          <TableRow key={contact.id}>
                            <TableCell>{contact.firstName} {contact.lastName}</TableCell>
                            <TableCell>{contact.companyName || 'N/A'}</TableCell>
                            <TableCell>{contact.position || 'N/A'}</TableCell>
                            <TableCell>{contact.email}</TableCell>
                            <TableCell>{contact.phone || 'N/A'}</TableCell>
                            <TableCell>
                              {contact.isPrimary && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  Primary
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditContact(contact)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteContact(contact)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Company Form Drawer */}
      {isAddCompanyOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setIsAddCompanyOpen(false)}
          />
          <EscKeyHandler isOpen={isAddCompanyOpen} onClose={() => setIsAddCompanyOpen(false)} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white z-50 shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">Add New Company</h2>
                  <p className="text-sm text-muted-foreground">Add a new company to the system</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleAddCompany} data-testid="btn-submit-company">
                  <Save className="w-4 h-4 mr-2" />
                  Add Company
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsAddCompanyOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Company Name *</Label>
                      <Input
                        placeholder="Enter company name"
                        value={companyForm.name}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        placeholder="e.g., Healthcare, Construction"
                        value={companyForm.industry}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, industry: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Address</Label>
                      <Textarea
                        placeholder="Enter company address"
                        value={companyForm.address}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, address: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 234-567-8900"
                        value={companyForm.phone}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="info@company.com"
                        value={companyForm.email}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Website</Label>
                      <Input
                        placeholder="www.company.com"
                        value={companyForm.website}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, website: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Contact Form Drawer */}
      {isAddContactOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setIsAddContactOpen(false)}
          />
          <EscKeyHandler isOpen={isAddContactOpen} onClose={() => setIsAddContactOpen(false)} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white z-50 shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">Add New Contact</h2>
                  <p className="text-sm text-muted-foreground">Add a new contact to a company</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleAddContact}>
                  <Save className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsAddContactOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Select
                        value={contactForm.companyId}
                        onValueChange={(value) =>
                          setContactForm({ ...contactForm, companyId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                              {company.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Name *</Label>
                      <Input
                        placeholder="Enter contact name"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Input
                        placeholder="e.g., Procurement Manager"
                        value={contactForm.position}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            position: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        placeholder="contact@company.com"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 234-567-8900"
                        value={contactForm.phone}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Edit Company Form Drawer */}
      {isEditCompanyOpen && editingCompany && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setIsEditCompanyOpen(false)}
          />
          <EscKeyHandler isOpen={isEditCompanyOpen} onClose={() => setIsEditCompanyOpen(false)} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-[80%] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">Edit Company</h2>
                  <p className="text-sm text-muted-foreground">Update company information</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleUpdateCompany}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsEditCompanyOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Company Name *</Label>
                      <Input
                        placeholder="Enter company name"
                        value={companyForm.name}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        placeholder="e.g., Healthcare, Construction"
                        value={companyForm.industry}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, industry: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Address</Label>
                      <Textarea
                        placeholder="Enter company address"
                        value={companyForm.address}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, address: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 234-567-8900"
                        value={companyForm.phone}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="info@company.com"
                        value={companyForm.email}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Website</Label>
                      <Input
                        placeholder="www.company.com"
                        value={companyForm.website}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, website: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Edit Contact Form Drawer */}
      {isEditContactOpen && editingContact && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setIsEditContactOpen(false)}
          />
          <EscKeyHandler isOpen={isEditContactOpen} onClose={() => setIsEditContactOpen(false)} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-[80%] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">Edit Contact</h2>
                  <p className="text-sm text-muted-foreground">Update contact information</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleUpdateContact}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsEditContactOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Select
                        value={contactForm.companyId}
                        onValueChange={(value) =>
                          setContactForm({ ...contactForm, companyId: value })
                        }
                        disabled
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                              {company.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Name *</Label>
                      <Input
                        placeholder="Enter contact name"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Input
                        placeholder="e.g., Procurement Manager"
                        value={contactForm.position}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            position: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        placeholder="contact@company.com"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 234-567-8900"
                        value={contactForm.phone}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
