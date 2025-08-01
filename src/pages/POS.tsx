import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Table,
  Typography,
  Select,
  Tag,
  Divider,
  Grid,
  Form,
  InputNumber,
  message,
} from 'antd';
import {
  PlusOutlined,
  UserAddOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';

const useBreakpoint = Grid.useBreakpoint;
const { Title, Text } = Typography;

// --- START: MODIFIED TYPES TO MATCH BACKEND API ---
// Interface matching the public.products_services table structure (from previous context)
interface ProductDB {
  id: number;
  name: string;
  description: string | null;
  unit_price: number; // Renamed from sellingPrice
  cost_price: number | null;
  sku: string | null;
  is_service: boolean;
  stock_quantity: number; // Renamed from qty
  created_at: Date;
  updated_at: Date;
  tax_rate_id: number | null;
  category: string | null;
  unit: string | null;
  tax_rate_value?: number;
}

// Interface for Customer (from previous context, mapped to frontend camelCase)
interface CustomerFrontend {
  id: string; // Changed to string as it comes from DB (PostgreSQL IDs can be large numbers, safer as string)
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null; // Changed from vatNumber to taxId to match mapCustomerToFrontend
  totalInvoiced: number; // Already camelCase
  // Note: creditScore from dummy data is not in CustomerDB, will need to be managed
  // if it's a frontend-only concept or added to DB. For now, it's removed.
}

// Type for cart items, based on ProductDB
type CartItem = ProductDB & { quantity: number; subtotal: number };
type PaymentType = 'Cash' | 'Bank' | 'Credit';
// --- END: MODIFIED TYPES TO MATCH BACKEND API ---

const API_BASE_URL = 'https://madebyquantbackend.onrender.com'; // IMPORTANT: Replace with your actual backend API URL

export default function POSScreen() {
  const [messageApi, contextHolder] = message.useMessage();
  const screens = useBreakpoint();

  const [customers, setCustomers] = useState<CustomerFrontend[]>([]); // Now fetched from API
  const [products, setProducts] = useState<ProductDB[]>([]); // Now fetched from API

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerFrontend | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerForm] = Form.useForm();
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<ProductDB | null>(null);
  const [productModal, setProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productQty, setProductQty] = useState(1);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [dueDate, setDueDate] = useState<string | null>(null);

  // --- START: FETCH DATA FROM API ON COMPONENT MOUNT ---
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/customers`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: CustomerFrontend[] = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
        messageApi.error('Failed to fetch customers.');
      }
    }

    async function fetchProducts() {
      try {
        const response = await fetch(`${API_BASE_URL}/products-services`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ProductDB[] = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        messageApi.error('Failed to fetch products.');
      }
    }

    fetchCustomers();
    fetchProducts();
  }, []); // Empty dependency array means this runs once on mount
  // --- END: FETCH DATA FROM API ON COMPONENT MOUNT ---

  // Add to cart logic
  const addToCart = () => {
    if (!selectedProduct || productQty < 1) return;

    // --- MODIFIED: Use selectedProduct.stock_quantity instead of .qty ---
    const availableQty = selectedProduct.stock_quantity ?? 0;
    const alreadyInCart = cart.find(i => i.id === selectedProduct.id)?.quantity ?? 0;
    if (productQty + alreadyInCart > availableQty) {
      messageApi.error(
        `Not enough stock for "${selectedProduct.name}". Only ${
          availableQty - alreadyInCart
        } units available.`,
      );
      return;
    }
    const existing = cart.find(i => i.id === selectedProduct.id);
    if (existing) {
      setCart(
        cart.map(i =>
          i.id === selectedProduct.id
            ? {
                ...i,
                quantity: i.quantity + productQty,
                subtotal: (i.quantity + productQty) * i.unit_price, // Use unit_price
              }
            : i,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          ...selectedProduct,
          quantity: productQty,
          subtotal: productQty * selectedProduct.unit_price, // Use unit_price
        },
      ]);
    }
    setSelectedProduct(null);
    setProductQty(1);
    setProductModal(false);
  };

  // Remove from cart
  const removeFromCart = (id: number) => setCart(cart.filter(i => i.id !== id)); // ID type changed to number

  // --- START: MODIFIED handleAddCustomer TO USE API ---
  const handleAddCustomer = async (values: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    taxId?: string;
  }) => {
    try {
      // Check for existing customer by phone before adding (optional, but good practice)
      const existingCustomerResponse = await fetch(
        `${API_BASE_URL}/api/customers?search=${values.phone}`,
      );
      const existingCustomers: CustomerFrontend[] =
        await existingCustomerResponse.json();
      const existing = existingCustomers.find(
        c => c.phone?.replace(/\D/g, '') === values.phone.replace(/\D/g, ''),
      );

      if (existing) {
        setSelectedCustomer(existing);
        messageApi.info(
          'Customer with that phone number already exists. Selected existing record.',
        );
      } else {
        const response = await fetch(`${API_BASE_URL}/api/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: values.name,
            phone: values.phone,
            email: values.email || null, // Ensure null for optional fields if empty
            address: values.address || null,
            vatNumber: values.taxId || null, // Map taxId from form to vatNumber for API
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.detail || errorData.error || 'Failed to add new customer.',
          );
        }

        const newCustomer: CustomerFrontend = await response.json();
        setCustomers(prev => [...prev, newCustomer]); // Add new customer to state
        setSelectedCustomer(newCustomer);
        messageApi.success('New customer added and selected.');
      }
    } catch (error: any) {
      console.error('Error adding customer:', error);
      messageApi.error(error.message || 'Failed to add new customer.');
    } finally {
      setCustomerModal(false);
      setShowNewCustomer(false);
      newCustomerForm.resetFields();
    }
  };
  // --- END: MODIFIED handleAddCustomer TO USE API ---

  // Cart total
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const change = paymentType === 'Cash' ? amountPaid - total : 0;

  // --- START: MODIFIED SALE SUBMISSION TO USE API ---
  const handleSubmit = async () => {
    if (cart.length === 0) {
      messageApi.warning('Add at least one product to the cart');
      return;
    }
    if (paymentType === 'Credit' && !selectedCustomer) {
      messageApi.error('Customer not selected for credit sale.');
      return;
    }
    // Optional: Add more robust credit check logic if needed (e.g., from customer's data fetched from backend)
    // For now, if a customer is selected for credit, proceed.

    try {
      const salePayload = {
        cart: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
        paymentType,
        total,
        customer: selectedCustomer
          ? { id: selectedCustomer.id, name: selectedCustomer.name }
          : null,
        amountPaid: paymentType === 'Cash' ? amountPaid : 0,
        change: paymentType === 'Cash' ? change : 0,
        dueDate: paymentType === 'Credit' ? dueDate : null,
        // These would come from authenticated user data or configuration
        tellerName: 'Dummy Teller', // Replace with actual user's name if authenticated
        branch: 'Dummy Branch', // Replace with actual branch if applicable
        companyName: 'DummyCo', // Replace with actual company name
      };

      const response = await fetch(`${API_BASE_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit sale.');
      }

      const result = await response.json();
      console.log('Sale submitted successfully:', result);

      // --- OPTIONAL: Re-fetch products to update stock quantities displayed ---
      // This ensures the displayed stock reflects the latest from the database
      // after a sale, especially if multiple POS stations are operating.
      try {
        const productsResponse = await fetch(`${API_BASE_URL}/products-services`);
        if (productsResponse.ok) {
          const updatedProductsFromAPI: ProductDB[] =
            await productsResponse.json();
          setProducts(updatedProductsFromAPI);
        } else {
          console.warn(
            'Failed to re-fetch products after sale, stock display might be outdated.',
          );
        }
      } catch (fetchError) {
        console.warn('Error re-fetching products:', fetchError);
      }

      // Clear cart and reset payment details
      setCart([]);
      setAmountPaid(0);
      setDueDate(null);
      setSelectedCustomer(null);
      setPaymentType('Cash');
      messageApi.success('Sale submitted and recorded successfully!');
    } catch (err: any) {
      console.error('Error during sale submission:', err);
      messageApi.error(err.message || 'Could not save sale.');
    }
  };
  // --- END: MODIFIED SALE SUBMISSION TO USE API ---

  return (
    <>
      {contextHolder}
      <div style={{ padding: 18, maxWidth: 650, margin: '0 auto' }}>
        <Title level={3}>Point of Sale</Title>

        {/* Customer Select */}
        <Card
          style={{ marginBottom: 12, cursor: 'pointer' }}
          onClick={() => setCustomerModal(true)}
          bodyStyle={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Text strong>
              {selectedCustomer
                ? selectedCustomer.name
                : 'Select Customer (Optional)'}
            </Text>
            <div style={{ fontSize: 12, color: '#888' }}>
              {selectedCustomer?.phone}
            </div>
          </div>
          <UserAddOutlined />
        </Card>

        {/* Product Select */}
        <Card
          style={{ marginBottom: 12, cursor: 'pointer' }}
          onClick={() => setProductModal(true)}
          bodyStyle={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Text strong>
              {selectedProduct ? selectedProduct.name : 'Select Product'}
            </Text>
            <div style={{ fontSize: 12, color: '#888' }}>
              {selectedProduct ? `Price: R${selectedProduct.unit_price}` : ''}{' '}
              {/* Use unit_price */}
            </div>
            {selectedProduct && (
              <div style={{ fontSize: 12, color: '#888' }}>
                Stock: {selectedProduct.stock_quantity ?? 0}{' '}
                {selectedProduct.unit || ''} {/* Use stock_quantity */}
              </div>
            )}
          </div>
          <ShoppingCartOutlined />
        </Card>

        {/* Quantity & Add to Cart */}
        {selectedProduct && (
          <Row gutter={6} align='middle' style={{ marginBottom: 10 }}>
            <Col>
              <Button
                size='small'
                onClick={() => setProductQty(q => Math.max(1, q - 1))}
              >
                -
              </Button>
            </Col>
            <Col>
              <InputNumber
                min={1}
                value={productQty}
                onChange={value => setProductQty(value ?? 1)}
                style={{ width: 60 }}
              />
            </Col>
            <Col>
              <Button
                size='small'
                onClick={() => {
                  const max = selectedProduct?.stock_quantity ?? Infinity; // Use stock_quantity
                  setProductQty(q => Math.min(q + 1, max));
                }}
              >
                +
              </Button>
            </Col>
            <Col>
              <Button type='primary' onClick={addToCart}>
                Add to Cart
              </Button>
            </Col>
          </Row>
        )}

        {/* Cart */}
        <Card title='Cart' style={{ marginBottom: 14 }}>
          {screens.md ? (
            <Table
              dataSource={cart}
              rowKey='id'
              pagination={false}
              columns={[
                { title: 'Product', dataIndex: 'name' },
                { title: 'Qty', dataIndex: 'quantity' },
                { title: 'Unit Price', dataIndex: 'unit_price' }, // Use unit_price
                {
                  title: 'Total',
                  render: (_, r) =>
                    `R${(r.unit_price * r.quantity).toFixed(2)}`, // Use unit_price
                },
                {
                  title: 'Action',
                  render: (_, r) => (
                    <Button
                      danger
                      size='small'
                      onClick={() => removeFromCart(r.id)}
                    >
                      Remove
                    </Button>
                  ),
                },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell colSpan={3}>Total</Table.Summary.Cell>
                  <Table.Summary.Cell>R{total.toFixed(2)}</Table.Summary.Cell>
                  <Table.Summary.Cell />
                </Table.Summary.Row>
              )}
            />
          ) : cart.length === 0 ? (
            <Text type='secondary'>Cart is empty</Text>
          ) : (
            cart.map(item => (
              <Card key={item.id} size='small' style={{ marginBottom: 6 }}>
                <Row justify='space-between' align='middle'>
                  <Col>
                    <Text strong>{item.name}</Text>{' '}
                    <Tag>
                      {item.quantity} x R{item.unit_price}{' '}
                      {/* Use unit_price */}
                    </Tag>
                    <div>Total: R{item.subtotal.toFixed(2)}</div>
                  </Col>
                  <Col>
                    <Button
                      size='small'
                      danger
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </Button>
                  </Col>
                </Row>
              </Card>
            ))
          )}
        </Card>

        {/* Payment and Submit */}
        <Card>
          <Row gutter={12} align='middle'>
            <Col flex='1 1 auto'>
              <Text strong>Payment Method</Text>
              <Select
                value={paymentType}
                onChange={setPaymentType}
                style={{ width: '100%' }}
              >
                <Select.Option value='Cash'>Cash</Select.Option>
                <Select.Option value='Bank'>Bank</Select.Option>
                <Select.Option value='Credit'>Credit</Select.Option>
              </Select>
            </Col>
            {paymentType === 'Cash' && (
              <Col flex='1 1 auto'>
                <Text>Amount Paid</Text>
                <InputNumber
                  min={0}
                  value={amountPaid}
                  onChange={value => setAmountPaid(value ?? 0)}
                  style={{ width: '100%' }}
                />
                <div>
                  <Text strong>
                    Change:&nbsp;
                    <span style={{ color: change < 0 ? 'red' : 'green' }}>
                      {change < 0 ? 'Insufficient' : `R${change.toFixed(2)}`}
                    </span>
                  </Text>
                </div>
              </Col>
            )}
            {paymentType === 'Credit' && (
              <Col flex='1 1 auto'>
                <Text>Due Date</Text>
                <Input
                  type='date'
                  value={dueDate || ''}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ width: '100%' }}
                />
                {/* Re-evaluate credit score logic based on CustomerFrontend type */}
                {selectedCustomer && (
                  <Text type='warning' style={{ color: 'orange' }}>
                    Credit payment selected. Ensure customer credit policy is
                    met.
                  </Text>
                )}
              </Col>
            )}
          </Row>
          <Divider />
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong>Total: R{total.toFixed(2)}</Text>
          </div>
          <Button
            type='primary'
            block
            onClick={handleSubmit}
            disabled={
              cart.length === 0 ||
              (paymentType === 'Cash' && amountPaid < total) ||
              // Re-evaluate credit payment disable logic based on CustomerFrontend type
              (paymentType === 'Credit' && !selectedCustomer)
            }
          >
            Submit Sale
          </Button>
        </Card>

        {/* ----------- Modals ----------- */}
        <Modal
          open={customerModal}
          onCancel={() => {
            setCustomerModal(false);
            setShowNewCustomer(false);
          }}
          footer={null}
          title='Select Customer'
        >
          <Input
            placeholder='Search'
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ maxHeight: 270, overflowY: 'auto' }}>
            {customers
              .filter(
                c =>
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  c.phone?.includes(customerSearch) || // Search by phone too
                  c.email?.toLowerCase().includes(customerSearch.toLowerCase()),
              )
              .map(c => (
                <Card
                  key={c.id}
                  style={{ marginBottom: 7, cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setCustomerModal(false);
                  }}
                  size='small'
                  bodyStyle={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>{c.name}</Text>
                    <div style={{ fontSize: 13, color: '#888' }}>{c.phone}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{c.email}</div>
                    {/* Removed creditScore tag as it's not in the new CustomerFrontend type */}
                  </div>
                </Card>
              ))}
          </div>
          {!showNewCustomer ? (
            <Button
              block
              type='dashed'
              icon={<PlusOutlined />}
              onClick={() => setShowNewCustomer(true)}
            >
              Add New Customer
            </Button>
          ) : (
            <Form
              form={newCustomerForm}
              onFinish={handleAddCustomer}
              layout='vertical'
              style={{ marginTop: 12 }}
            >
              <Form.Item
                name='name'
                label='Full Name'
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name='phone'
                label='Phone Number'
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name='email'
                label='Email (Optional)'
                rules={[{ type: 'email', message: 'Please enter a valid email!' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name='address' label='Address (Optional)'>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name='taxId' label='Tax ID / VAT Number (Optional)'>
                <Input />
              </Form.Item>
              <Button htmlType='submit' type='primary' block>
                Save & Select
              </Button>
            </Form>
          )}
        </Modal>

        <Modal
          open={productModal}
          onCancel={() => setProductModal(false)}
          footer={null}
          title='Select Product'
        >
          <Input
            placeholder='Search'
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ maxHeight: 270, overflowY: 'auto' }}>
            {products
              .filter(
                p =>
                  p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                  p.sku?.toLowerCase().includes(productSearch.toLowerCase()),
              )
              .map(p => (
                <Card
                  key={p.id}
                  style={{ marginBottom: 7, cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedProduct(p);
                    setProductModal(false);
                  }}
                  size='small'
                  bodyStyle={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>{p.name}</Text>
                    <div style={{ fontSize: 13, color: '#888' }}>
                      R{p.unit_price} &nbsp; | &nbsp; Stock: {p.stock_quantity ?? 0}{' '}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </Modal>
      </div>
    </>
  );
}