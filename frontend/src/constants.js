/**
 * ForensikGaji Frontend - Application Constants
 *
 * This module contains static data and configuration values used throughout
 * the application, including the expert marketplace database.
 *
 * @module constants
 * @author ForensikGaji Team
 * @created May 2026
 */

// Initial empty containers state for new users
export const initialContainers = [];

/**
 * Expert Marketplace Database
 *
 * Mock data for the expert marketplace feature. In production, this would
 * be fetched from an API. Each expert has ratings, skills, hourly rates,
 * and reviews from past HR clients.
 *
 * @type {Array<Object>}
 */
export const expertDatabase = [
  {
    id: 101,
    name: 'Arif - Java Architect',
    role: 'Technical Lead',
    company: 'TechNova MY',
    rating: 5.0,
    reviews: 89,
    rate: 150, // RM per hour
    skills: ['System Architecture', 'Java'],
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
    bio: 'Arif has over 12 years of experience designing scalable enterprise systems. He specializes in deep-dive technical interviews to uncover a candidate\'s true capabilities in Java, Spring Boot, and microservices.',
    reviewList: [
      {
        author: 'HR Director, Bank Negara',
        rating: 5,
        text: 'Arif caught a candidate lying about their architectural experience within 10 minutes. Absolute lifesaver.'
      },
      {
        author: 'Tech Recruiter, FinTech Asia',
        rating: 5,
        text: 'Very professional. Provided a highly detailed technical breakdown of the candidate.'
      }
    ]
  },
  {
    id: 102,
    name: 'Dr. Siti Nurhaliza',
    role: 'AI Engineer',
    company: 'DataCore',
    rating: 4.9,
    reviews: 124,
    rate: 180,
    skills: ['Machine Learning', 'Python', 'Data Science'],
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    bio: 'Dr. Siti holds a PhD in Machine Learning and currently leads AI initiatives. She is an expert at evaluating data scientists and AI engineers for both theoretical knowledge and practical coding skills.',
    reviewList: [
      {
        author: 'CTO, DataCorp',
        rating: 5,
        text: 'Her technical questions are brilliant. She really tests if they understand the math behind the models.'
      }
    ]
  },
  {
    id: 103,
    name: 'Lee - Android Lead',
    role: 'Mobile Developer',
    company: 'AppWorks',
    rating: 4.8,
    reviews: 56,
    rate: 200,
    skills: ['Kotlin', 'Mobile Security'],
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    bio: 'Lee has published multiple top-charting Android apps and regularly speaks at mobile security conferences. He audits mobile developers for security best practices.',
    reviewList: [
      {
        author: 'VP of Engineering, AppWorks',
        rating: 5,
        text: 'Lee is our go-to for filtering senior mobile talent.'
      }
    ]
  },
  {
    id: 104,
    name: 'Sarah Wong',
    role: 'Frontend Specialist',
    company: 'WebFlow Inc',
    rating: 4.7,
    reviews: 42,
    rate: 120,
    skills: ['React', 'Vue', 'UI/UX'],
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    bio: 'Sarah is a frontend wizard obsessed with performance and accessibility. She ensures candidates can write clean, scalable component architectures.',
    reviewList: [
      {
        author: 'Startup Founder',
        rating: 5,
        text: 'Found us an amazing React developer who completely revamped our dashboard.'
      }
    ]
  },
  {
    id: 105,
    name: 'Ahmad Faiz',
    role: 'DevOps Architect',
    company: 'CloudSec MY',
    rating: 4.9,
    reviews: 105,
    rate: 250,
    skills: ['AWS', 'Kubernetes', 'CI/CD'],
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    bio: 'Ahmad specializes in cloud infrastructure and security. He rigorously tests DevOps candidates on system resilience, automation, and container orchestration.',
    reviewList: [
      {
        author: 'Engineering Manager',
        rating: 5,
        text: 'His Kubernetes scenario questions are incredibly effective at weeding out beginners.'
      }
    ]
  },
  {
    id: 106,
    name: 'Elena Rodriguez',
    role: 'Cybersecurity Analyst',
    company: 'SecureNet',
    rating: 5.0,
    reviews: 33,
    rate: 300,
    skills: ['Penetration Testing', 'Ethical Hacking'],
    image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=150&q=80',
    bio: 'Elena is a former white-hat hacker who evaluates security engineers through rigorous live penetration testing scenarios.',
    reviewList: [
      {
        author: 'CISO, FinBank',
        rating: 5,
        text: 'Elena\'s assessment saved us from hiring a dangerously underqualified security lead.'
      }
    ]
  }
];
