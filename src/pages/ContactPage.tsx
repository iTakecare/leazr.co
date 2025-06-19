
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';

const ContactPage: React.FC = () => {
  const navigate = useNavigate();

  console.log('ContactPage rendering successfully');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            📞 Nous contacter
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Contactez
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Notre Équipe
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🤝 Une question ? Un projet ? Notre équipe d'experts est là pour vous accompagner 
            dans votre transformation digitale du leasing.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-xl">📧 Email</CardTitle>
                <CardDescription>Réponse sous 2h en moyenne</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-blue-600">contact@leazr.co</p>
                <p className="text-sm text-slate-600 mt-2">support@leazr.co pour le support technique</p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Phone className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                <CardTitle className="text-xl">📞 Téléphone</CardTitle>
                <CardDescription>Lun-Ven 9h-18h</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-emerald-600">+33 1 23 45 67 89</p>
                <p className="text-sm text-slate-600 mt-2">Appel gratuit depuis la France</p>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle className="text-xl">💬 Chat Live</CardTitle>
                <CardDescription>Disponible 9h-19h</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Démarrer le chat
                </Button>
                <p className="text-sm text-slate-600 mt-2">Réponse immédiate</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">📝 Nous écrire</CardTitle>
                <CardDescription>
                  Décrivez-nous votre projet, nous vous recontactons rapidement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Prénom *</label>
                    <input type="text" className="w-full p-3 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom *</label>
                    <input type="text" className="w-full p-3 border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email professionnel *</label>
                  <input type="email" className="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Entreprise</label>
                  <input type="text" className="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Téléphone</label>
                  <input type="tel" className="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Votre message *</label>
                  <textarea 
                    rows={4} 
                    className="w-full p-3 border border-slate-300 rounded-lg"
                    placeholder="Décrivez-nous votre projet ou vos besoins..."
                  ></textarea>
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3">
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer le message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Office Info */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <MapPin className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>🏢 Notre Bureau</CardTitle>
                <CardDescription>Venez nous rencontrer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">
                  123 Avenue des Champs-Élysées<br />
                  75008 Paris, France
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Métro : Charles de Gaulle - Étoile
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-emerald-600 mb-2" />
                <CardTitle>⏰ Horaires</CardTitle>
                <CardDescription>Nos disponibilités</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">
                  Lundi - Vendredi : 9h00 - 18h00<br />
                  Samedi : 9h00 - 12h00<br />
                  Dimanche : Fermé
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Support technique 24/7 pour les clients Enterprise
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-xl font-bold text-blue-600 mb-4">Leazr</div>
              <p className="text-slate-600 text-sm">
                💼 La solution métier de référence pour le leasing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">📦 Solution</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">⚡ Fonctionnalités</button></li>
                <li><button className="hover:text-blue-600 transition-colors">💰 Tarifs</button></li>
                <li><button className="hover:text-blue-600 transition-colors">🔒 Sécurité</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">🆘 Support</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">📚 Documentation</button></li>
                <li><button className="hover:text-blue-600 transition-colors">📞 Contact</button></li>
                <li><button className="hover:text-blue-600 transition-colors">🎓 Formation</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">🏢 Entreprise</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">ℹ️ À propos</button></li>
                <li><button className="hover:text-blue-600 transition-colors">📝 Blog</button></li>
                <li><button className="hover:text-blue-600 transition-colors">💼 Carrières</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-12 pt-8 text-center text-sm text-slate-600">
            <p>© 2025 Leazr.co est une marque développée par iTakecare SRL. Tous droits réservés. 💙</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
