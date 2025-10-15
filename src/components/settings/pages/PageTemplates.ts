import { CustomPage } from '@/hooks/useTemplateDesigner';

export const PAGE_TEMPLATES: Record<string, Omit<CustomPage, 'id' | 'order'>> = {
  coverPage: {
    title: "Page de garde",
    enabled: true,
    layout: 'full-width',
    backgroundColor: '#3b82f6',
    blocks: [
      {
        id: 'logo-1',
        type: 'logo',
        order: 0,
        width: '100%',
        content: { 
          useCompanyLogo: true,
          size: 150,
          position: 'center'
        },
        style: {
          padding: 40,
          margin: 20
        }
      },
      {
        id: 'title-1',
        type: 'text',
        order: 1,
        width: '100%',
        content: { 
          text: "Votre solution de leasing",
          isTitle: true,
          isRichText: false
        },
        style: {
          fontSize: 36,
          color: '#ffffff',
          fontWeight: 'bold',
          align: 'center',
          padding: 20
        }
      },
      {
        id: 'subtitle-1',
        type: 'text',
        order: 2,
        width: '100%',
        content: { 
          text: "Proposé par {company_name}",
          isTitle: false,
          isRichText: false
        },
        style: {
          fontSize: 18,
          color: '#ffffff',
          fontWeight: 'normal',
          align: 'center',
          padding: 10
        }
      }
    ]
  },
  
  visionPage: {
    title: "Notre vision",
    enabled: true,
    layout: 'two-columns',
    blocks: [
      {
        id: 'title-1',
        type: 'text',
        order: 0,
        width: '100%',
        content: { 
          text: "Notre Vision",
          isTitle: true,
          isRichText: false
        },
        style: {
          fontSize: 24,
          color: '#1e293b',
          fontWeight: 'bold',
          align: 'center',
          padding: 20,
          margin: 10
        }
      },
      {
        id: 'image-1',
        type: 'image',
        order: 1,
        width: '50%',
        content: {
          url: "",
          alt: "Vision",
          width: 250,
          height: 200,
          position: 'center'
        },
        style: {
          padding: 10
        }
      },
      {
        id: 'text-1',
        type: 'text',
        order: 2,
        width: '50%',
        content: { 
          text: "Nous croyons en une solution durable et responsable pour votre entreprise. Notre mission est de vous accompagner dans votre transformation digitale tout en préservant l'environnement.",
          isTitle: false,
          isRichText: true
        },
        style: {
          fontSize: 12,
          color: '#64748b',
          fontWeight: 'normal',
          align: 'left',
          padding: 10
        }
      }
    ]
  },

  statsPage: {
    title: "Nos chiffres clés",
    enabled: true,
    layout: 'full-width',
    blocks: [
      {
        id: 'title-1',
        type: 'text',
        order: 0,
        width: '100%',
        content: { 
          text: "Nos Chiffres Clés",
          isTitle: true,
          isRichText: false
        },
        style: {
          fontSize: 24,
          color: '#1e293b',
          fontWeight: 'bold',
          align: 'center',
          padding: 20
        }
      },
      {
        id: 'stats-1',
        type: 'stats',
        order: 1,
        width: '100%',
        content: {
          stats: [
            { label: "Clients satisfaits", value: "500+", icon: "users" },
            { label: "Appareils déployés", value: "10,000+", icon: "monitor" },
            { label: "CO2 économisé", value: "50 tonnes", icon: "leaf" }
          ],
          layout: 'grid'
        },
        style: {
          padding: 20
        }
      }
    ]
  },

  testimonialsPage: {
    title: "Témoignages clients",
    enabled: true,
    layout: 'full-width',
    blocks: [
      {
        id: 'title-1',
        type: 'text',
        order: 0,
        width: '100%',
        content: { 
          text: "Ils nous font confiance",
          isTitle: true,
          isRichText: false
        },
        style: {
          fontSize: 24,
          color: '#1e293b',
          fontWeight: 'bold',
          align: 'center',
          padding: 20
        }
      },
      {
        id: 'testimonial-1',
        type: 'testimonial',
        order: 1,
        width: '100%',
        content: {
          quote: "Excellent service et accompagnement tout au long du projet. Nous recommandons vivement !",
          author: "Jean Dupont",
          company: "Entreprise XYZ",
          avatarUrl: ""
        },
        style: {
          padding: 20,
          margin: 10
        }
      }
    ]
  },

  termsPage: {
    title: "Modalités et Conditions",
    enabled: true,
    layout: 'full-width',
    blocks: [
      {
        id: 'title-1',
        type: 'text',
        order: 0,
        width: '100%',
        content: { 
          text: "Modalités et Conditions",
          isTitle: true,
          isRichText: false
        },
        style: {
          fontSize: 24,
          color: '#1e293b',
          fontWeight: 'bold',
          align: 'center',
          padding: 20
        }
      },
      {
        id: 'list-1',
        type: 'list',
        order: 1,
        width: '100%',
        content: {
          items: [
            "Contrat de location d'une durée de 36 mois",
            "Maintenance et support inclus pendant toute la durée",
            "Garantie en échange direct en cas de panne",
            "Livraison et installation sur site incluses",
            "Formation des utilisateurs comprise"
          ],
          style: 'bullet',
          icon: 'check'
        },
        style: {
          fontSize: 11,
          color: '#1e293b',
          padding: 15,
          margin: 10
        }
      }
    ]
  },

  blankPage: {
    title: "Page personnalisée",
    enabled: true,
    layout: 'full-width',
    blocks: []
  }
};
