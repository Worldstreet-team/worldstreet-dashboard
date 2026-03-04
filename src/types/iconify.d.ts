declare module '@iconify/react' {
  import { ComponentType, SVGProps } from 'react';

  export interface IconProps extends SVGProps<SVGSVGElement> {
    icon: string;
    width?: number | string;
    height?: number | string;
    color?: string;
    flip?: 'horizontal' | 'vertical' | 'both';
    rotate?: number | string;
    inline?: boolean;
  }

  export const Icon: ComponentType<IconProps>;
  export default Icon;
}
