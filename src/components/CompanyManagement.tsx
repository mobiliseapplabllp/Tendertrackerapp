import { useState } from 'react';
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
import { ScrollArea } from './ui/scroll-area';
import { Building2, Plus, Edit, Trash2, Search, Users, Mail, Phone } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  industry: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  status: 'active' | 'inactive';
  contactCount: number;
  tenderCount: number;
}

interface Contact {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: '1',
      name: 'City Airport Authority',
      industry: 'Transportation',
      address: '123 Airport Blvd, City, State 12345',
      phone: '+1 234-567-8901',
      email: 'info@cityairport.com',
      website: 'www.cityairport.com',
      status: 'active',
      contactCount: 3,
      tenderCount: 12,
    },
    {
      id: '2',
      name: 'Regional Hospital',
      industry: 'Healthcare',
      address: '456 Medical Center Dr, City, State 12345',
      phone: '+1 234-567-8902',
      email: 'procurement@regionalhospital.com',
      website: 'www.regionalhospital.com',
      status: 'active',
      contactCount: 5,
      tenderCount: 8,
    },
  ]);

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      companyId: '1',
      companyName: 'City Airport Authority',
      name: 'Robert Wilson',
      position: 'Procurement Director',
      email: 'r.wilson@cityairport.com',
      phone: '+1 234-567-8901 ext 101',
      isPrimary: true,
    },
    {
      id: '2',
      companyId: '1',
      companyName: 'City Airport Authority',
      name: 'Lisa Anderson',
      position: 'Project Manager',
      email: 'l.anderson@cityairport.com',
      phone: '+1 234-567-8901 ext 102',
      isPrimary: false,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

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
  });

  const handleAddCompany = () => {
    const newCompany: Company = {
      id: `company_${Date.now()}`,
      ...companyForm,
      status: 'active',
      contactCount: 0,
      tenderCount: 0,
    };
    setCompanies([...companies, newCompany]);
    setIsAddCompanyOpen(false);
    setCompanyForm({
      name: '',
      industry: '',
      address: '',
      phone: '',
      email: '',
      website: '',
    });
  };

  const handleAddContact = () => {
    const company = companies.find((c) => c.id === contactForm.companyId);
    if (company) {
      const newContact: Contact = {
        id: `contact_${Date.now()}`,
        companyName: company.name,
        ...contactForm,
        isPrimary: false,
      };
      setContacts([...contacts, newContact]);
      setIsAddContactOpen(false);
      setContactForm({
        companyId: '',
        name: '',
        position: '',
        email: '',
        phone: '',
      });
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Tabs defaultValue="companies" className="w-full">
            <TabsList>
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            </TabsList>

            {/* Companies Tab */}
            <TabsContent value="companies" className="space-y-4 mt-4">
              {isAddCompanyOpen && (
                <Card className="p-6">
                  <h3 className="mb-4">Add New Company</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label>Industry *</Label>
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
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleAddCompany}>Add Company</Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddCompanyOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              )}

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
                  <Button onClick={() => setIsAddCompanyOpen(!isAddCompanyOpen)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Company
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Tenders</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div>
                            <p>{company.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {company.website}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{company.industry}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {company.email}
                            </p>
                            <p className="text-sm flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {company.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{company.contactCount} contacts</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">
                            {company.tenderCount} tenders
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              company.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {company.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="space-y-4 mt-4">
              {isAddContactOpen && (
                <Card className="p-6">
                  <h3 className="mb-4">Add New Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2"
                        value={contactForm.companyId}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            companyId: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
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
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleAddContact}>Add Contact</Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddContactOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              )}

              <Card className="p-4">
                <div className="flex justify-end mb-4">
                  <Button onClick={() => setIsAddContactOpen(!isAddContactOpen)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>

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
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>{contact.name}</TableCell>
                        <TableCell>{contact.companyName}</TableCell>
                        <TableCell>{contact.position}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>
                          {contact.isPrimary && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Primary
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
