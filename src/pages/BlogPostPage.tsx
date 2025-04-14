import React from "react";
import { useParams, Navigate } from "react-router-dom";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import BlogHero from "@/components/blog/BlogHero";
import BlogPostContent from "@/components/blog/BlogPostContent";
import RelatedPosts from "@/components/blog/RelatedPosts";
import Newsletter from "@/components/blog/Newsletter";

// Sample blog data (same as in BlogPage to keep it consistent)
const blogPosts = [
  {
    id: 1,
    title: "Comment le leasing de matériel reconditionné réduit l'empreinte carbone de votre entreprise",
    excerpt: "Découvrez comment le choix du matériel informatique reconditionné peut considérablement réduire l'impact environnemental de votre entreprise tout en optimisant vos coûts.",
    date: "12 avril 2025",
    category: "Développement durable",
    image: "/lovable-uploads/56939bad-b11e-421e-8dca-13f8a485973b.png",
    slug: "leasing-materiel-reconditionne-empreinte-carbone",
    author: {
      name: "Marie Dupont",
      role: "Responsable Développement Durable",
      avatar: "/lovable-uploads/fd238acc-acf0-4045-8257-a57d72209f2c.png"
    }
  },
  {
    id: 2,
    title: "Guide complet: Choisir le bon MacBook Pro pour votre équipe",
    excerpt: "Un guide pratique pour sélectionner les MacBook Pro reconditionnés adaptés aux besoins spécifiques de chaque membre de votre équipe.",
    date: "5 avril 2025",
    category: "Matériel",
    image: "/lovable-uploads/1c9b904d-1c96-4dff-994c-4daaf6fd3ec1.png",
    slug: "guide-choix-macbook-pro-equipe",
    author: {
      name: "Thomas Lambert",
      role: "Expert Technique",
      avatar: "/lovable-uploads/653cda1e-cf1a-4e33-957d-39cbc3c149a4.png"
    }
  },
  {
    id: 3,
    title: "5 avantages fiscaux du leasing de matériel informatique",
    excerpt: "Explorez les bénéfices fiscaux souvent méconnus qui font du leasing une solution financièrement avantageuse pour les entreprises de toutes tailles.",
    date: "28 mars 2025",
    category: "Finance",
    image: "/lovable-uploads/ad810d22-f182-4048-aae9-fd658e229330.png",
    slug: "avantages-fiscaux-leasing-informatique",
    author: {
      name: "Sophie Leroy",
      role: "Conseillère Financière",
      avatar: "/lovable-uploads/fd238acc-acf0-4045-8257-a57d72209f2c.png"
    }
  },
  {
    id: 4,
    title: "Tendances 2025 : L'évolution du travail hybride et ses impacts sur l'équipement IT",
    excerpt: "Analyse des nouvelles tendances du travail hybride et comment les entreprises adaptent leur infrastructure informatique pour répondre à ces changements.",
    date: "20 mars 2025",
    category: "Tendances",
    image: "/lovable-uploads/10277032-6bec-4f1c-a1b5-884fb4f2a2ce.png",
    slug: "tendances-travail-hybride-equipment-it",
    author: {
      name: "Jean Dubois",
      role: "Analyste de Marché",
      avatar: "/lovable-uploads/653cda1e-cf1a-4e33-957d-39cbc3c149a4.png"
    }
  },
  {
    id: 5,
    title: "Cas client : Comment une PME a économisé 30% sur ses coûts IT grâce au reconditionnement",
    excerpt: "Étude de cas détaillée sur la transformation digitale d'une PME belge qui a opté pour du matériel reconditionné haut de gamme.",
    date: "15 mars 2025",
    category: "Témoignages",
    image: "/lovable-uploads/5c6e8763-e237-4646-96d9-c54a63bf6893.png",
    slug: "cas-client-pme-economie-it-reconditionnement",
    author: {
      name: "Claire Martin",
      role: "Responsable Relations Clients",
      avatar: "/lovable-uploads/fd238acc-acf0-4045-8257-a57d72209f2c.png"
    }
  },
  {
    id: 6,
    title: "Les meilleures pratiques pour prolonger la durée de vie de votre parc informatique",
    excerpt: "Conseils pratiques et stratégies d'entretien pour maximiser la longévité et les performances de vos équipements IT professionnels.",
    date: "8 mars 2025",
    category: "Maintenance",
    image: "/lovable-uploads/c8fe2b25-222e-46ff-9a1f-e567d4e08db8.png",
    slug: "meilleures-pratiques-prolonger-duree-vie-parc-informatique",
    author: {
      name: "Paul Legrand",
      role: "Technicien Senior",
      avatar: "/lovable-uploads/653cda1e-cf1a-4e33-957d-39cbc3c149a4.png"
    }
  }
];

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // Find the post with the matching slug
  const post = blogPosts.find(post => post.slug === slug);
  
  // If no post is found, redirect to the blog main page
  if (!post) {
    return <Navigate to="/blog" replace />;
  }
  
  // Get 3 related posts (excluding the current one)
  const relatedPosts = blogPosts
    .filter(p => p.id !== post.id)
    .slice(0, 3);
  
  // Sample content for the blog post (in a real app, this would come from a database or CMS)
  const sampleContent = (
    <>
      <p>
        Dans un monde où la durabilité devient une priorité pour les entreprises responsables, le choix de l'équipement informatique joue un rôle crucial dans la réduction de l'empreinte écologique. Le leasing de matériel reconditionné représente une solution innovante qui permet non seulement de réaliser des économies substantielles, mais aussi de contribuer activement à la protection de l'environnement.
      </p>
      
      <h2>L'impact environnemental du matériel informatique neuf</h2>
      
      <p>
        La production d'un ordinateur portable neuf nécessite environ 240 kg de combustibles fossiles, 22 kg de produits chimiques et 1,5 tonne d'eau. Ce processus génère également une quantité importante de gaz à effet de serre, contribuant ainsi au réchauffement climatique. En optant pour du matériel reconditionné, vous réduisez considérablement cet impact en prolongeant la durée de vie des équipements existants.
      </p>
      
      <h2>Les avantages écologiques du reconditionnement</h2>
      
      <p>
        Le reconditionnement d'un ordinateur permet d'économiser jusqu'à 70% des ressources naturelles qui auraient été nécessaires pour fabriquer un nouvel appareil. De plus, chaque appareil reconditionné représente une économie d'environ 20 à 30 kg de CO2 qui n'est pas rejeté dans l'atmosphère.
      </p>
      
      <h2>Comment le leasing amplifie ces bénéfices</h2>
      
      <p>
        Le modèle de leasing optimise l'utilisation des ressources en permettant à plusieurs entreprises de bénéficier successivement du même équipement au cours de son cycle de vie. Cette approche circulaire maximise l'efficacité des ressources et minimise les déchets électroniques, qui représentent aujourd'hui le flux de déchets connaissant la croissance la plus rapide au niveau mondial.
      </p>
      
      <h2>Chiffres clés pour votre entreprise</h2>
      
      <p>
        Une entreprise de 50 employés qui opte pour du matériel informatique reconditionné peut réduire son empreinte carbone d'environ 15 tonnes de CO2 sur trois ans, soit l'équivalent des émissions annuelles de trois voitures. Ces chiffres peuvent être intégrés à votre rapport RSE pour démontrer votre engagement envers des pratiques commerciales durables.
      </p>
      
      <h2>Les solutions iTakecare pour une informatique écoresponsable</h2>
      
      <p>
        Chez iTakecare, nous proposons une gamme complète de matériel informatique reconditionné de haute qualité, principalement des MacBook, Surface et ThinkPad, qui ont été méticuleusement testés et remis à neuf selon des normes strictes. Notre service de leasing tout-inclus comprend également la maintenance, le support et le remplacement rapide, garantissant ainsi une expérience utilisateur optimale sans compromis sur la qualité ou les performances.
      </p>
      
      <p>
        En choisissant iTakecare pour votre parc informatique, vous faites un pas significatif vers un modèle d'entreprise plus durable, tout en bénéficiant d'équipements performants à un coût réduit. Une solution gagnante tant pour votre entreprise que pour la planète.
      </p>
    </>
  );

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px]">
        <BlogHero />
        
        <BlogPostContent 
          title={post.title}
          content={sampleContent}
          date={post.date}
          category={post.category}
          image={post.image}
          author={post.author}
        />
        
        <div className="container mx-auto px-4">
          <Newsletter />
        </div>
        
        <RelatedPosts posts={relatedPosts} />
        
        <HomeFooter />
      </div>
    </div>
  );
};

export default BlogPostPage;
