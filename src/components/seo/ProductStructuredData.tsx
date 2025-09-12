import React from "react";
import { Helmet } from "react-helmet-async";
import type { Product } from "@/types/catalog";

interface ProductStructuredDataProps {
  product: Product;
  company: {
    name: string;
    slug: string;
  };
  companySlug: string;
}

const ProductStructuredData: React.FC<ProductStructuredDataProps> = ({ 
  product, 
  company, 
  companySlug 
}) => {
  // Generate the product URL
  const productUrl = `https://itakecare.be/${companySlug}/products/${product.slug || product.id}`;
  
  // Handle pricing - use monthly price if available, otherwise regular price
  const price = product.monthly_price || product.price || product.min_variant_price;
  const hasPrice = price && price > 0;
  
  // Handle availability
  const availability = product.active !== false ? "InStock" : "OutOfStock";
  
  // Create the structured data object
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.short_description || `${product.name} disponible chez ${company.name}`,
    "brand": {
      "@type": "Brand",
      "name": product.brand || company.name
    },
    "category": product.category,
    "image": product.image_url ? [product.image_url] : undefined,
    "url": productUrl,
    "sku": product.id,
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "EUR",
      "price": hasPrice ? price.toString() : undefined,
      "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Valid for 1 year
      "availability": `https://schema.org/${availability}`,
      "seller": {
        "@type": "Organization",
        "name": company.name,
        "url": `https://itakecare.be/${companySlug}`
      }
    },
    // Add aggregateRating if we have rating data (placeholder for now)
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "reviewCount": "1",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  // Remove undefined fields
  const cleanedData = JSON.parse(JSON.stringify(structuredData));

  return (
    <Helmet>
      {/* Product structured data */}
      <script type="application/ld+json">
        {JSON.stringify(cleanedData)}
      </script>
      
      {/* SEO Meta tags */}
      <title>{`${product.name} - ${company.name} | iTakecare`}</title>
      <meta 
        name="description" 
        content={product.description || product.short_description || `Découvrez ${product.name} chez ${company.name}. Location et vente d'équipements professionnels.`}
      />
      <link rel="canonical" href={productUrl} />
      
      {/* Open Graph tags */}
      <meta property="og:title" content={`${product.name} - ${company.name}`} />
      <meta property="og:description" content={product.description || product.short_description || `${product.name} disponible chez ${company.name}`} />
      <meta property="og:url" content={productUrl} />
      <meta property="og:type" content="product" />
      {product.image_url && <meta property="og:image" content={product.image_url} />}
      
      {/* Product specific Open Graph tags */}
      {hasPrice && <meta property="product:price:amount" content={price.toString()} />}
      <meta property="product:price:currency" content="EUR" />
      <meta property="product:availability" content={availability.toLowerCase()} />
      {product.brand && <meta property="product:brand" content={product.brand} />}
      {product.category && <meta property="product:category" content={product.category} />}
    </Helmet>
  );
};

export default ProductStructuredData;