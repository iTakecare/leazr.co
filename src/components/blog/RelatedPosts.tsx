
import React from "react";
import { Button } from "@/components/ui/button";
import BlogCard from "./BlogCard";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface RelatedPostsProps {
  posts: Array<{
    id: number;
    title: string;
    excerpt: string;
    date: string;
    category: string;
    image: string;
    slug: string;
    readTime: string;
  }>;
}

const RelatedPosts = ({ posts }: RelatedPostsProps) => {
  return (
    <div className="py-12 bg-[#f8f8f6]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Articles similaires</h2>
          <Link to="/blog">
            <Button variant="ghost" className="group flex items-center text-[#48b5c3] hover:text-[#33638E]">
              Voir tous les articles
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map(post => (
            <BlogCard 
              key={post.id}
              title={post.title}
              excerpt={post.excerpt}
              date={post.date}
              category={post.category}
              image={post.image}
              slug={post.slug}
              readTime={post.readTime}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelatedPosts;
