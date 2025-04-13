
import React from "react";
import { useParams, Link } from "react-router-dom";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import CtaSection from "@/components/home/CtaSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Facebook, Twitter, Linkedin, Copy, CalendarIcon, Clock } from "lucide-react";
import BlogHero from "@/components/blog/BlogHero";
import BlogPostContent from "@/components/blog/BlogPostContent";
import RelatedPosts from "@/components/blog/RelatedPosts";

// Données simulées pour le blog post
const blogPost = {
  id: 1,
  title: "L'impact écologique du numérique : enjeux et solutions",
  content: `
    <p>Le secteur du numérique représente aujourd'hui près de 4% des émissions mondiales de gaz à effet de serre, soit davantage que l'aviation civile. Cette empreinte carbone continue de s'accroître avec la multiplication des équipements et l'augmentation des usages numériques. Face à ce constat, il devient essentiel de repenser notre approche du numérique en entreprise.</p>
    
    <h2>L'empreinte environnementale des équipements informatiques</h2>
    
    <p>La fabrication d'un ordinateur professionnel nécessite en moyenne :</p>
    <ul>
      <li>240 kg de combustibles fossiles</li>
      <li>22 kg de produits chimiques</li>
      <li>1,5 tonne d'eau</li>
    </ul>
    
    <p>Ces chiffres mettent en évidence l'importance de prolonger la durée de vie des équipements. En effet, plus de 80% de l'empreinte environnementale d'un appareil numérique est liée à sa phase de fabrication, et non à son utilisation.</p>
    
    <h2>Le reconditionnement : une solution efficace</h2>
    
    <p>Le reconditionnement de matériel informatique permet de réduire significativement l'impact environnemental du numérique en entreprise. Une étude récente montre qu'en optant pour du matériel reconditionné plutôt que neuf, une entreprise peut :</p>
    
    <ul>
      <li>Réduire de 70% les émissions de CO2 liées à son parc informatique</li>
      <li>Économiser 80% des ressources naturelles nécessaires à la fabrication</li>
      <li>Diminuer sa consommation d'eau de plus de 60%</li>
    </ul>
    
    <h2>Allier performance et responsabilité</h2>
    
    <p>Contrairement aux idées reçues, opter pour du matériel reconditionné ne signifie pas sacrifier la performance. Les équipements reconditionnés par des professionnels offrent des performances équivalentes au matériel neuf pour la plupart des usages professionnels courants.</p>
    
    <p>Le leasing de matériel reconditionné va encore plus loin en combinant :</p>
    
    <ul>
      <li>L'accès à des équipements premium à moindre coût</li>
      <li>La garantie d'un matériel toujours adapté aux besoins</li>
      <li>La réduction significative de l'empreinte environnementale</li>
      <li>Une gestion simplifiée du cycle de vie des équipements</li>
    </ul>
    
    <h2>Vers une stratégie numérique responsable</h2>
    
    <p>Au-delà du simple choix d'équipements reconditionnés, les entreprises peuvent adopter une véritable stratégie numérique responsable incluant :</p>
    
    <ul>
      <li>L'optimisation des ressources numériques</li>
      <li>La sensibilisation des collaborateurs aux bonnes pratiques</li>
      <li>L'allongement de la durée d'usage des équipements</li>
      <li>La mise en place d'une politique de fin de vie responsable</li>
    </ul>
    
    <p>Cette approche globale permet de concilier efficacement performance économique et responsabilité environnementale.</p>
    
    <h2>Conclusion</h2>
    
    <p>Le reconditionnement et le leasing de matériel informatique constituent des solutions concrètes et accessibles pour réduire l'impact environnemental du numérique en entreprise. En adoptant ces pratiques, les organisations peuvent contribuer significativement à la construction d'un numérique plus responsable tout en optimisant leurs coûts.</p>
  `,
  date: "18 mars 2023",
  author: "Sophie Laurent",
  authorRole: "Responsable Développement Durable",
  category: "Durabilité",
  image: "/lovable-uploads/aa41f092-7d73-4917-9bb9-78e029f4a786.png",
  slug: "impact-ecologique-numerique-enjeux-solutions",
  readTime: "6 min"
};

// Données simulées pour les articles similaires
const relatedPosts = [
  {
    id: 2,
    title: "Économiser grâce au matériel reconditionné : une étude de cas",
    excerpt: "Comment une PME a réduit ses coûts informatiques de 40% tout en améliorant la performance de son parc.",
    date: "2 avril 2023",
    category: "Économie",
    image: "/lovable-uploads/dd01c4d2-2532-40c5-b511-60b4cf1d88f6.png",
    slug: "economiser-materiel-reconditionne-etude-cas"
  },
  {
    id: 5,
    title: "Comment choisir la bonne solution de gestion de parc IT",
    excerpt: "Critères essentiels pour sélectionner un outil de gestion de parc informatique adapté à vos besoins.",
    date: "20 mai 2023",
    category: "IT Management",
    image: "/lovable-uploads/8d038f0d-17e4-4f5f-8ead-f7719343506f.png",
    slug: "choisir-solution-gestion-parc-it"
  },
  {
    id: 3,
    title: "Sécurité et confidentialité sur du matériel reconditionné",
    excerpt: "Les garanties et certifications pour assurer la sécurité totale de vos données sur du matériel reconditionné.",
    date: "15 avril 2023",
    category: "Sécurité",
    image: "/lovable-uploads/95b23886-6036-4673-a2d8-fcee08de89b1.png",
    slug: "securite-confidentialite-materiel-reconditionne"
  }
];

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // Dans une application réelle, vous récupéreriez le post en fonction du slug
  // Pour l'exemple, nous utilisons les données simulées directement
  
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    // Dans une application réelle, vous afficheriez une notification de confirmation
  };

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <UnifiedNavigation />
      
      {/* Hero Section avec fond similaire à la page d'accueil */}
      <div className="pt-[100px] relative">
        {/* Background image (avec hauteur réduite) */}
        <div className="absolute inset-0 z-0 h-[300px]">
          <img
            className="w-full h-full object-cover"
            alt="Background"
            src="/clip-path-group.png"
          />
          {/* Gradient fade to white overlay */}
          <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>
      
      {/* Content Section */}
      <div className="container mx-auto px-4 relative z-10 -mt-[150px]">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/blog" className="flex items-center text-[#48b5c3] hover:text-[#33638E] transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Retour aux articles</span>
          </Link>
        </div>
        
        {/* Blog Hero */}
        <BlogHero 
          title={blogPost.title}
          category={blogPost.category}
          date={blogPost.date}
          author={blogPost.author}
          authorRole={blogPost.authorRole}
          image={blogPost.image}
          readTime={blogPost.readTime}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* Sidebar for sharing */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="lg:sticky lg:top-[120px]">
              <div className="flex lg:flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-500 hidden lg:block mb-2">Partager</h4>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')}>
                  <Facebook className="h-4 w-4 text-[#1877F2]" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${window.location.href}`, '_blank')}>
                  <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${window.location.href}`, '_blank')}>
                  <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={copyLinkToClipboard}>
                  <Copy className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="lg:col-span-8 order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
              <BlogPostContent content={blogPost.content} />
              
              {/* Tags */}
              <div className="mt-10 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-[#f8f8f6] text-gray-700 hover:bg-gray-200 px-3 py-1">
                    Numérique responsable
                  </Badge>
                  <Badge className="bg-[#f8f8f6] text-gray-700 hover:bg-gray-200 px-3 py-1">
                    Reconditionnement
                  </Badge>
                  <Badge className="bg-[#f8f8f6] text-gray-700 hover:bg-gray-200 px-3 py-1">
                    Écologie
                  </Badge>
                  <Badge className="bg-[#f8f8f6] text-gray-700 hover:bg-gray-200 px-3 py-1">
                    RSE
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar for info */}
          <div className="lg:col-span-2 order-3">
            <div className="lg:sticky lg:top-[120px]">
              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="mb-4">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>Date de publication</span>
                  </div>
                  <p className="font-medium">{blogPost.date}</p>
                </div>
                <div>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Temps de lecture</span>
                  </div>
                  <p className="font-medium">{blogPost.readTime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Related Posts */}
      <RelatedPosts posts={relatedPosts} />
      
      {/* CTA Section */}
      <CtaSection />
      
      {/* Footer */}
      <HomeFooter />
    </div>
  );
};

export default BlogPostPage;
