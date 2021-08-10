import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem("@RocketShoes:cart");

    if (storageCart) {
      return JSON.parse(storageCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get(`/products/${productId}`);
      const stock = await api.get(`/stock/${productId}`);

      let updateCart: Product[];

      const isProductInCart = cart.some(
        (cartProduct) => cartProduct.id === productId
      );

      if (isProductInCart) {
        updateCart = [
          ...cart.map((cartProduct) =>
            cartProduct.id === productId
              ? { ...cartProduct, amount: cartProduct.amount + 1 }
              : cartProduct
          ),
        ];
      } else {
        updateCart = [...cart, { ...product.data, amount: 1 }];
      }

      const amountOfSelectedProduct = updateCart.filter(
        (product) => product.id === productId
      )[0].amount;

      if (amountOfSelectedProduct > stock.data.amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      setCart(updateCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateCart));
    } catch ({ message }) {
      toast.error("Erro na adição do produto");
      toast.error(message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.find((product) => product.id === productId);

      if (!productExist) {
        throw new Error("Erro na remoção do produto");
      }

      const updatedCart = cart.filter((product) => product.id !== productId);

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch ({ message }) {
      toast.error(message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      const updatedCart = cart.map((product) =>
        product.id === productId ? { ...product, amount: amount } : product
      );

      const amountOfSelectedProduct = updatedCart.filter(
        (product) => product.id === productId
      )[0].amount;

      if (amountOfSelectedProduct > stock.data.amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch ({ message }) {
      toast.error("Erro na alteração de quantidade do produto");
      toast.error(message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
