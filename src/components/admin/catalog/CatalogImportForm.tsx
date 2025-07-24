import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WooCommerceImportForm } from "./WooCommerceImportForm";
import { FirecrawlImportForm } from "./FirecrawlImportForm";

export function CatalogImportForm() {
  return (
    <Tabs defaultValue="woocommerce" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="woocommerce">WooCommerce</TabsTrigger>
        <TabsTrigger value="firecrawl">Web Scraping</TabsTrigger>
      </TabsList>
      
      <TabsContent value="woocommerce" className="mt-6">
        <WooCommerceImportForm />
      </TabsContent>
      
      <TabsContent value="firecrawl" className="mt-6">
        <FirecrawlImportForm />
      </TabsContent>
    </Tabs>
  );
}