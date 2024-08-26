import { type ClassValue, clsx } from "clsx"
import { Metadata } from "next"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const formatPrice = (price: number) => {
  const formatter=new Intl.NumberFormat('en-US',{
    style:"currency",
    currency:"USD"
  })
  return formatter.format(price)
}



export function constructMetadata({
  title="NextCase - custom high-quality phone cases",
  description="Design your own custom phone case. Choose from a variety of materials and finishes to create a unique and durable case for your phone.",
  image="/thumbnail.png",
  icons='/favicon.ico',
}:{
  title?:string
  description?:string
  image?:string
  icons?:string
}={}):Metadata{
  return {
    title,
    description,
    openGraph:{
      title,
      description,
      images:[{
        url:image
    }]
  },
  twitter:{
    card:"summary_large_image",
    title,
    description,
    images:[image],
    //creator:'example' //twitter handle
  },
  icons,
  metadataBase:new URL('https://nextcase.vercel.app/')
  }
  }
