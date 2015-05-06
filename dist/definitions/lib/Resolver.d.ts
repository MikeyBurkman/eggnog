interface Resolver {
    import<T>(id: string): T;
    local<T>(id: string): T;
    external<T>(id: string): T;
    global<T>(id: string): T;
}
export = Resolver;
