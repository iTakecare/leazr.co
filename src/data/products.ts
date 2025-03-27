import { Product } from "@/types/catalog";

// Sample data for products
export const products: Product[] = [
  {
    id: "1",
    name: "Laptop Pro X1",
    description: "High performance laptop for professionals",
    price: 1299.99,
    monthly_price: 69.99,
    image_url: "/images/laptop1.jpg",
    category: "laptop",
    brand: "TechBrand",
    specifications: {
      processor: "Intel i7",
      memory: "16GB",
      storage: "512GB SSD",
      display: "15.6-inch 4K",
      graphics: "NVIDIA GeForce RTX",
      battery: "Up to 10 hours"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "LPX1-001"
  },
  {
    id: "2",
    name: "Ergonomic Office Chair",
    description: "Comfortable and adjustable office chair",
    price: 249.00,
    monthly_price: 19.99,
    image_url: "/images/chair1.jpg",
    category: "furniture",
    brand: "ComfortPlus",
    specifications: {
      material: "Mesh",
      adjustability: "Full",
      weight_capacity: "300 lbs",
      color: "Black"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "CHR-002"
  },
  {
    id: "3",
    name: "Wireless Keyboard and Mouse Combo",
    description: "Reliable wireless combo for everyday use",
    price: 59.99,
    monthly_price: 5.99,
    image_url: "/images/keyboard1.jpg",
    category: "accessories",
    brand: "KeyMaster",
    specifications: {
      keyboard_type: "Wireless",
      mouse_type: "Optical",
      connectivity: "2.4 GHz",
      battery_life: "12 months"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "KBM-003"
  },
  {
    id: "4",
    name: "4K Ultra HD Monitor",
    description: "Stunning visuals for work and entertainment",
    price: 399.00,
    monthly_price: 29.99,
    image_url: "/images/monitor1.jpg",
    category: "monitor",
    brand: "VisionTech",
    specifications: {
      screen_size: "27-inch",
      resolution: "3840x2160",
      panel_type: "IPS",
      response_time: "5ms",
      refresh_rate: "60Hz"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "MON-004"
  },
  {
    id: "5",
    name: "Noise Cancelling Headphones",
    description: "Immerse yourself in your work or music",
    price: 199.00,
    monthly_price: 14.99,
    image_url: "/images/headphones1.jpg",
    category: "audio",
    brand: "AudioZenith",
    specifications: {
      type: "Over-ear",
      noise_cancellation: "Active",
      battery_life: "Up to 20 hours",
      connectivity: "Bluetooth 5.0"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "HPH-005"
  },
  {
    id: "6",
    name: "Standing Desk Converter",
    description: "Transform your desk into a standing workstation",
    price: 299.00,
    monthly_price: 22.99,
    image_url: "/images/desk1.jpg",
    category: "furniture",
    brand: "ErgoRise",
    specifications: {
      adjustability: "Height adjustable",
      desk_size: "32x24 inches",
      weight_capacity: "40 lbs",
      material: "Wood"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "DSK-006"
  },
  {
    id: "7",
    name: "Webcam 1080p",
    description: "High-definition webcam for video conferencing",
    price: 79.99,
    monthly_price: 7.99,
    image_url: "/images/webcam1.jpg",
    category: "accessories",
    brand: "ClearView",
    specifications: {
      resolution: "1920x1080",
      frame_rate: "30fps",
      microphone: "Built-in",
      connectivity: "USB"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "WCM-007"
  },
  {
    id: "8",
    name: "External SSD 1TB",
    description: "Portable solid-state drive for fast data transfer",
    price: 149.00,
    monthly_price: 11.99,
    image_url: "/images/ssd1.jpg",
    category: "storage",
    brand: "DataSwift",
    specifications: {
      capacity: "1TB",
      transfer_speed: "Up to 500MB/s",
      connectivity: "USB 3.0",
      form_factor: "Portable"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "SSD-008"
  },
  {
    id: "9",
    name: "Wireless Charging Pad",
    description: "Convenient wireless charging for your devices",
    price: 29.99,
    monthly_price: 2.99,
    image_url: "/images/charger1.jpg",
    category: "accessories",
    brand: "ChargeUp",
    specifications: {
      compatibility: "Qi-enabled devices",
      charging_speed: "10W",
      material: "Aluminum",
      color: "Black"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "CHP-009"
  },
  {
    id: "10",
    name: "Laptop Backpack",
    description: "Durable and stylish backpack for laptops and accessories",
    price: 89.00,
    monthly_price: 8.99,
    image_url: "/images/backpack1.jpg",
    category: "accessories",
    brand: "CarryAll",
    specifications: {
      laptop_size: "Up to 15.6-inch",
      material: "Water-resistant nylon",
      capacity: "20L",
      color: "Gray"
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sku: "BCK-010"
  }
];
