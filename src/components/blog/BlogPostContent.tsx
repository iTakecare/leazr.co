
import React from "react";

interface BlogPostContentProps {
  content: string;
}

const BlogPostContent = ({ content }: BlogPostContentProps) => {
  return (
    <div 
      className="prose prose-lg max-w-none prose-headings:text-gray-800 prose-headings:font-bold prose-p:text-gray-600"
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  );
};

export default BlogPostContent;
