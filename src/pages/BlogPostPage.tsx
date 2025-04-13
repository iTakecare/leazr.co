
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Mail,
  Tag,
  MessageCircle
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Types pour les articles de blog
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  category: string;
  tags: string[];
  featured?: boolean;
}

// Données de démonstration pour les articles de blog
const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Comment réduire l'empreinte carbone de votre parc informatique",
    excerpt: "Découvrez les stratégies efficaces pour minimiser l'impact environnemental de vos équipements informatiques.",
    content: `
      <p>Dans un monde de plus en plus digitalisé, l'impact environnemental du matériel informatique est devenu une préoccupation majeure pour les entreprises soucieuses de leur responsabilité sociale et environnementale.</p>
      
      <h2>Comprendre l'empreinte carbone numérique</h2>
      
      <p>L'empreinte carbone numérique d'une entreprise comprend plusieurs aspects :</p>
      
      <ul>
        <li>La fabrication des équipements (ordinateurs, serveurs, périphériques)</li>
        <li>L'énergie consommée pendant leur utilisation</li>
        <li>La gestion de fin de vie des produits</li>
        <li>Les infrastructures de réseau et centres de données</li>
      </ul>
      
      <p>Il est important de noter que la phase de fabrication représente souvent plus de 70% de l'empreinte carbone totale d'un appareil informatique sur son cycle de vie.</p>
      
      <h2>Stratégies pour réduire l'impact environnemental</h2>
      
      <h3>1. Prolonger la durée de vie des équipements</h3>
      
      <p>La mesure la plus efficace pour réduire l'empreinte carbone consiste à prolonger la durée d'utilisation des appareils. En étendant le cycle de vie d'un ordinateur portable de 3 à 5 ans, vous pouvez réduire son impact environnemental de près de 40%.</p>
      
      <h3>2. Opter pour des équipements reconditionnés</h3>
      
      <p>Le matériel reconditionné offre une alternative écologique tout en garantissant des performances professionnelles. Les appareils reconditionnés permettent d'économiser jusqu'à 80% des ressources par rapport à la fabrication d'un appareil neuf.</p>
      
      <h3>3. Mettre en place une gestion écoresponsable</h3>
      
      <p>Une politique de gestion de parc informatique écoresponsable inclut :</p>
      
      <ul>
        <li>Une maintenance préventive régulière</li>
        <li>Des paramètres d'économie d'énergie optimisés</li>
        <li>Une formation des utilisateurs aux bonnes pratiques</li>
        <li>Un plan de recyclage pour les appareils en fin de vie</li>
      </ul>
      
      <h3>4. Privilégier des fournisseurs engagés</h3>
      
      <p>Choisissez des partenaires qui proposent des solutions de reprise et de recyclage, et qui peuvent certifier la conformité de leurs processus avec les normes environnementales en vigueur.</p>
      
      <h2>Mesurer et suivre votre progression</h2>
      
      <p>Pour vérifier l'efficacité de votre démarche, mettez en place des indicateurs de performance environnementale :</p>
      
      <ul>
        <li>Âge moyen du parc informatique</li>
        <li>Taux de reconditionnement</li>
        <li>Consommation énergétique des équipements</li>
        <li>Quantité de déchets électroniques générés</li>
      </ul>
      
      <p>En conclusion, réduire l'empreinte carbone de votre parc informatique n'est pas seulement bénéfique pour l'environnement, c'est aussi une démarche qui peut générer des économies significatives et améliorer votre image de marque auprès de clients de plus en plus sensibles aux questions écologiques.</p>
    `,
    author: "Marie Dupont",
    date: "2025-04-02",
    readTime: "5 min",
    image: "/lovable-uploads/3adf9af1-b4a0-4b3f-9603-1e04cf6deeb0.png",
    category: "Durabilité",
    tags: ["green IT", "écologie", "empreinte carbone"],
    featured: true
  },
  {
    id: "2",
    title: "Les avantages économiques de la location de matériel informatique",
    excerpt: "Une analyse complète des bénéfices financiers liés à la location plutôt qu'à l'achat de vos équipements IT.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    author: "Thomas Lefebvre",
    date: "2025-03-28",
    readTime: "8 min",
    image: "/lovable-uploads/77cb8f7a-a865-497e-812d-e04c6d5c9160.png",
    category: "Finance",
    tags: ["location", "économie", "TCO"]
  },
  {
    id: "3",
    title: "Optimiser la durée de vie de vos ordinateurs portables professionnels",
    excerpt: "Conseils pratiques pour prolonger la durée d'utilisation de vos laptops en entreprise.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    author: "Sophie Martin",
    date: "2025-03-20",
    readTime: "6 min",
    image: "/lovable-uploads/8d038f0d-17e4-4f5f-8ead-f7719343506f.png",
    category: "Maintenance",
    tags: ["durabilité", "maintenance", "laptops"]
  }
];

// Articles similaires (pour la section en bas de page)
const getRelatedPosts = (currentPostId: string, category: string): BlogPost[] => {
  return blogPosts
    .filter(post => post.id !== currentPostId && (post.category === category || post.tags.some(tag => 
      blogPosts.find(p => p.id === currentPostId)?.tags.includes(tag))))
    .slice(0, 3);
};

const BlogPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Trouver l'article correspondant à l'ID
  const post = blogPosts.find(post => post.id === id);
  
  // Rediriger vers la page 404 si l'article n'existe pas
  if (!post) {
    return (
      <>
        <UnifiedNavigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Article introuvable</h1>
          <p className="mb-8">L'article que vous recherchez n'existe pas ou a été déplacé.</p>
          <Button 
            onClick={() => navigate('/blog')}
            className="bg-[#48b5c3] hover:bg-[#3da6b4]"
          >
            Retour au blog
          </Button>
        </div>
      </>
    );
  }
  
  // Format de la date pour l'affichage
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };
  
  // Articles similaires
  const relatedPosts = getRelatedPosts(post.id, post.category);
  
  // Générer les initiales pour l'avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  return (
    <div className="min-h-screen bg-white pt-[120px] pb-24">
      <UnifiedNavigation />
      
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Bouton de retour */}
        <Button 
          variant="ghost" 
          className="mb-8 text-gray-600 hover:text-[#33638E]"
          onClick={() => navigate('/blog')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au blog
        </Button>
        
        {/* En-tête de l'article */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-[#48b5c3] mb-4">
            <span className="bg-[#E5F7F9] px-3 py-1 rounded-full">{post.category}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#33638E] mb-4">{post.title}</h1>
          <p className="text-xl text-gray-600 mb-6">{post.excerpt}</p>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-500">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src="" alt={post.author} />
                <AvatarFallback className="bg-[#33638E] text-white">
                  {getInitials(post.author)}
                </AvatarFallback>
              </Avatar>
              <span>{post.author}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formatDate(post.date)}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{post.readTime} de lecture</span>
            </div>
          </div>
        </div>
        
        {/* Image principale */}
        <div className="mb-10 rounded-2xl overflow-hidden shadow-md">
          <img 
            src={post.image} 
            alt={post.title} 
            className="w-full h-[300px] md:h-[400px] object-cover"
          />
        </div>
        
        {/* Contenu de l'article */}
        <div 
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-10">
          <Tag className="h-5 w-5 text-gray-500" />
          {post.tags.map(tag => (
            <span 
              key={tag} 
              className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm hover:bg-gray-200 cursor-pointer"
              onClick={() => navigate(`/blog?tag=${tag}`)}
            >
              {tag}
            </span>
          ))}
        </div>
        
        {/* Partage */}
        <div className="mb-10">
          <Separator className="mb-6" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="font-medium flex items-center">
              <Share2 className="mr-2 h-5 w-5 text-gray-600" />
              Partager cet article
            </span>
            <div className="flex gap-3">
              <Button variant="outline" size="icon" className="rounded-full" aria-label="Partager sur Facebook">
                <Facebook className="h-5 w-5 text-[#1877F2]" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" aria-label="Partager sur Twitter">
                <Twitter className="h-5 w-5 text-[#1DA1F2]" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" aria-label="Partager sur LinkedIn">
                <Linkedin className="h-5 w-5 text-[#0A66C2]" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" aria-label="Partager par email">
                <Mail className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>
          <Separator className="mt-6" />
        </div>
        
        {/* Section newsletter */}
        <div className="bg-[#E5F7F9] rounded-2xl p-8 md:p-10 mb-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-bold text-[#33638E] mb-4">Vous avez aimé cet article ?</h2>
            <p className="text-gray-600 mb-6">
              Abonnez-vous à notre newsletter pour recevoir nos dernières publications et actualités
              directement dans votre boîte mail.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input 
                type="email"
                placeholder="Votre adresse email" 
                className="px-4 py-2 border border-gray-300 rounded-full flex-1 focus:outline-none focus:ring-2 focus:ring-[#48b5c3]"
              />
              <Button className="bg-[#33638E] hover:bg-[#48b5c3] text-white rounded-full">
                S'abonner
              </Button>
            </div>
          </div>
        </div>
        
        {/* Articles similaires */}
        {relatedPosts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-[#33638E]">Articles similaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <div 
                  key={relatedPost.id} 
                  className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/blog/${relatedPost.id}`)}
                >
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={relatedPost.image} 
                      alt={relatedPost.title} 
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex gap-2 mb-2">
                      <span className="bg-[#E5F7F9] text-[#48b5c3] text-xs px-2 py-1 rounded-full">
                        {relatedPost.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 line-clamp-2">{relatedPost.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(relatedPost.date)}</span>
                      <span>{relatedPost.readTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPostPage;
